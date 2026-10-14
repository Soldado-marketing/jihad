import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { MailService } from '../mail/mail.service';
import { effectiveVisibilityScope } from '../permissions/visibility-scope';
import { PrismaService } from '../prisma/prisma.service';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { hashInviteToken, INVITE_TTL_HOURS, isInviteTokenShape, newInviteToken } from './invite-token';

/** One answer for every unusable token, so the endpoint is no oracle. */
const INVALID = { code: 'INVITE_INVALID', message: 'This invitation is invalid or has expired.' };

/**
 * Invite flow (MAOS F-2). The OWNER invites a person by email into a role;
 * the person opens the emailed link, sets a name and password, and becomes an
 * ACTIVE member. It reuses User, TenantMembership and the existing login - no
 * second auth system.
 *
 * Fail-closed rules:
 *  - a token is single-use: acceptance moves the invite from SENT to ACCEPTED
 *    in one conditional write, so of two concurrent acceptances one wins;
 *  - unknown, malformed, used, revoked and expired tokens all get the same
 *    400 INVITE_INVALID;
 *  - the tenant must still be ACTIVE when the invite is accepted;
 *  - an email that already has an account is refused - an invite never sets
 *    the password of an existing user (that would be an account takeover);
 *  - tokens are stored only as sha256; the plain token exists in the email
 *    (or, when email is not configured, in the OWNER's create response).
 */
@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
  ) {}

  private async requireOwner(actorId: string, tenantId: string) {
    const m = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId: actorId } },
      select: { role: true, status: true },
    });
    if (!m || m.status !== 'ACTIVE' || m.role !== 'OWNER') throw new ForbiddenException('Owner access required.');
  }

  async create(actorId: string, tenantId: string, dto: CreateInviteDto) {
    await this.requireOwner(actorId, tenantId);
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      throw new ConflictException({
        code: 'INVITE_EMAIL_IN_USE',
        message: 'This email already has an account. Manage it through user requests instead.',
      });
    }

    const customerId = await this.customerForRole(tenantId, dto.role, dto.customerId);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
    const { token, tokenHash } = newInviteToken();
    const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);

    const invite = await this.prisma.$transaction(async (tx) => {
      // A new invite replaces any open one for the same email in this tenant.
      await tx.invite.updateMany({
        where: { tenantId, email, status: 'SENT' },
        data: { status: 'REVOKED', revokedAt: new Date() },
      });
      return tx.invite.create({
        data: { tenantId, email, role: dto.role, status: 'SENT', tokenHash, expiresAt, customerId },
        select: { id: true, email: true, role: true, status: true, expiresAt: true, createdAt: true, customer: { select: { id: true, name: true } } },
      });
    });

    const emailed = await this.mail.sendInviteEmail({
      to: email,
      tenantName: tenant?.name ?? 'your workspace',
      role: dto.role,
      token,
      expiresAt,
    });
    await this.recordAudit(tenantId, actorId, 'invite.created', invite.id, { role: dto.role, emailed });

    // Without email the OWNER must pass the link on personally; with email the
    // token is never returned, so it exists only in the recipient's inbox.
    return { invite, delivery: emailed ? 'emailed' : 'not_sent', ...(emailed ? {} : { inviteUrl: this.mail.inviteUrl(token) }) };
  }

  async list(actorId: string, tenantId: string) {
    await this.requireOwner(actorId, tenantId);
    const now = new Date();
    const rows = await this.prisma.invite.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true, email: true, role: true, status: true, expiresAt: true, acceptedAt: true, revokedAt: true, createdAt: true,
        customer: { select: { id: true, name: true } },
      },
    });
    // EXPIRED is derived, not stored: an open invite past its time reads expired.
    return rows.map((r) => (r.status === 'SENT' && r.expiresAt <= now ? { ...r, status: 'EXPIRED' as const } : r));
  }

  async revoke(actorId: string, tenantId: string, id: string) {
    await this.requireOwner(actorId, tenantId);
    const result = await this.prisma.invite.updateMany({
      where: { id, tenantId, status: 'SENT' },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });
    if (result.count !== 1) throw new NotFoundException('No open invitation with this id.');
    await this.recordAudit(tenantId, actorId, 'invite.revoked', id);
    return { id, status: 'REVOKED' as const };
  }

  /** What the acceptance page shows: workspace, role and the invited email. */
  async preview(token: unknown) {
    const invite = await this.findUsable(token);
    return {
      email: invite.email,
      role: invite.role,
      tenantName: invite.tenant.name,
      expiresAt: invite.expiresAt,
      ...(invite.customer ? { customerName: invite.customer.name } : {}),
    };
  }

  async accept(dto: AcceptInviteDto) {
    const invite = await this.findUsable(dto.token);
    const passwordHash = await bcrypt.hash(dto.password, 12);

    let result: { id: string };
    try {
      result = await this.prisma.$transaction(async (tx) => {
        // Single use: only the request that moves the invite out of SENT continues.
        const claimed = await tx.invite.updateMany({
          where: { id: invite.id, status: 'SENT', expiresAt: { gt: new Date() } },
          data: { status: 'ACCEPTED', acceptedAt: new Date() },
        });
        if (claimed.count !== 1) throw new BadRequestException(INVALID);

        const taken = await tx.user.findUnique({ where: { email: invite.email }, select: { id: true } });
        if (taken) throw new BadRequestException(INVALID);

        // CLIENT: the scope comes from the invite's Customer, re-checked now -
        // fail closed if it is gone, archived or in another tenant.
        let clientScopeKey: string | null = null;
        if (invite.role === 'CLIENT') {
          const customer = invite.customerId
            ? await tx.customer.findFirst({
                where: { id: invite.customerId, tenantId: invite.tenantId, status: 'ACTIVE' },
                select: { clientScopeKey: true },
              })
            : null;
          if (!customer) throw new BadRequestException(INVALID);
          clientScopeKey = customer.clientScopeKey;
        }

        const user = await tx.user.create({
          data: { email: invite.email, displayName: dto.fullName.trim(), passwordHash, status: 'APPROVED' },
          select: { id: true },
        });
        await tx.tenantMembership.create({
          data: {
            tenantId: invite.tenantId,
            userId: user.id,
            role: invite.role,
            status: 'ACTIVE',
            visibilityScope: effectiveVisibilityScope(invite.role),
            clientScopeKey,
          },
        });
        await tx.invite.update({ where: { id: invite.id }, data: { acceptedByUserId: user.id } });
        return user;
      });
    } catch (err: unknown) {
      // The same email accepted at the same moment through another tenant's
      // invite: the unique email index decides, and the loser rolls back.
      if ((err as { code?: unknown } | null)?.code === 'P2002') throw new BadRequestException(INVALID);
      throw err;
    }

    await this.recordAudit(invite.tenantId, result.id, 'invite.accepted', invite.id, { role: invite.role });
    return { message: 'Invitation accepted. You can now sign in.', tenantSlug: invite.tenant.slug };
  }

  /**
   * The Customer of a CLIENT invite: required, chosen explicitly, ACTIVE and
   * in this tenant. Any other role must not name one. Never inferred.
   */
  private async customerForRole(tenantId: string, role: string, customerId: string | undefined): Promise<string | null> {
    if (role !== 'CLIENT') {
      if (customerId !== undefined) {
        throw new BadRequestException({ code: 'INVITE_CUSTOMER_NOT_ALLOWED', message: 'Only a client invite names a customer.' });
      }
      return null;
    }
    const customer = customerId
      ? await this.prisma.customer.findFirst({ where: { id: customerId, tenantId, status: 'ACTIVE' }, select: { id: true } })
      : null;
    if (!customer) {
      throw new BadRequestException({ code: 'INVITE_CUSTOMER_REQUIRED', message: 'A client invite needs an active customer of this workspace.' });
    }
    return customer.id;
  }

  private async findUsable(token: unknown) {
    if (!isInviteTokenShape(token)) throw new BadRequestException(INVALID);
    const invite = await this.prisma.invite.findUnique({
      where: { tokenHash: hashInviteToken(token) },
      select: {
        id: true, tenantId: true, email: true, role: true, status: true, expiresAt: true, customerId: true,
        tenant: { select: { name: true, slug: true, status: true } },
        customer: { select: { name: true } },
      },
    });
    if (!invite || invite.status !== 'SENT' || invite.expiresAt <= new Date() || invite.tenant.status !== 'ACTIVE') {
      throw new BadRequestException(INVALID);
    }
    return invite;
  }

  private async recordAudit(tenantId: string, actorId: string, action: string, resourceId: string, payload?: Record<string, unknown>) {
    try {
      await this.audit.createAuditEvent({
        tenantId,
        actorId,
        resourceType: 'invite',
        resourceId,
        action,
        permissionResult: AuditPermissionResult.ALLOWED,
        outcome: AuditOutcome.SUCCESS,
        payload,
      });
    } catch {
      this.logger.warn(`audit_write_failed action=${action}`);
    }
  }
}
