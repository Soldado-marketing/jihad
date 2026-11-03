import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { LoginHistoryService } from '../login-history/login-history.service';
import {
  AuditOutcome,
  AuditPermissionResult,
  LoginBlockReason,
  RegistrationAction,
} from '../audit/audit.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { BootstrapOwnerDto } from './dto/bootstrap-owner.dto';
import { EXPLICIT_GRANTS, EXPLICIT_GRANT_KEYS, type ExplicitGrant, hasGrant, rowsAfterChange } from '../permissions/explicit-grants';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  tenantSlug: string;
  role: string;
  sessionId: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * User statuses that may hold a session. Checked at login, on every request
 * (validateSession) and on refresh, so a user who stops being in one of these
 * states loses access at once instead of when their tokens expire.
 */
const allowedStatuses: readonly string[] = ['APPROVED', 'ACTIVE'];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    private readonly mailService: MailService,
    private readonly loginHistory: LoginHistoryService,
  ) {}

  // ── Self-registration disabled (Owner: Invite Only, 2026-10-27) ────────
  // Keep this method as a fail-closed compatibility surface for callers
  // that still invoke AuthService.register directly. No DB or mail side effects.
  // SaaS public onboarding must be designed as a separate, reviewed task.
  async register(_dto: RegisterDto): Promise<{ message: string }> {
    throw new ForbiddenException('Registration is invitation-only. Contact your workspace owner.');
  }

  // ── Login (with status gate) ───────────────────────────────────────────────

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    user: { id: string; email: string; displayName: string | null; role: string };
    tenant: { id: string; name: string; slug: string };
    tokens: AuthTokens;
  }> {
    const { email, passwordOrMagicCode, tenantSlug } = dto;
    const attempt = { email, ip: ipAddress, userAgent: userAgent };

    type LoginUser = {
      id: string;
      email: string;
      displayName: string | null;
      status: string;
      passwordHash: string | null;
      memberships: Array<{
        tenantId: string;
        role: string;
        status: string; // included so we can filter in code rather than relying on Prisma enum filter
        permissions?: { granted: boolean }[];
        tenant: { id: string; name: string; slug: string; status: string };
      }>;
    };

    // Fetch all memberships (no Prisma-level enum filter); filter to ACTIVE in code below.
    // This avoids any edge-case where Prisma's `where: { status }` enum filter on an `as any`
    // client returns an empty array unexpectedly, locking out a freshly-approved user.
    const user = await (this.prisma as any).user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        memberships: {
          orderBy: { createdAt: 'asc' },
          include: {
            tenant: true,
            permissions: {
              where: { action: 'switch', resource: 'tenant' },
              select: { granted: true },
            },
          },
        },
      },
    }) as LoginUser | null;

    if (!user || !user.passwordHash) {
      await this.loginHistory.record({ ...attempt, outcome: 'FAILURE', reason: 'INVALID_CREDENTIALS', userId: user?.id });
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(passwordOrMagicCode, user.passwordHash);
    if (!passwordValid) {
      await this.loginHistory.record({ ...attempt, outcome: 'FAILURE', reason: 'INVALID_CREDENTIALS', userId: user.id });
      throw new UnauthorizedException('Invalid credentials');
    }

    const blocked = (reason: string) =>
      this.loginHistory.record({ ...attempt, outcome: 'BLOCKED', reason, userId: user.id });

    const userStatus = user.status as string;

    // ── Status gate — check before any session creation ──────────────────────
    if (userStatus === 'PENDING_APPROVAL') {
      await this.auditService.createAuditEvent({
        resourceType: 'User',
        resourceId: user.id,
        action: RegistrationAction.LOGIN_BLOCKED,
        permissionResult: AuditPermissionResult.DENIED,
        outcome: AuditOutcome.BLOCKED,
        failureCategory: LoginBlockReason.PENDING_APPROVAL,
        payload: { email: user.email },
      });
      await blocked('PENDING_APPROVAL');
      throw new ForbiddenException('Your account is waiting for approval.');
    }

    if (userStatus === 'REJECTED') {
      await this.auditService.createAuditEvent({
        resourceType: 'User',
        resourceId: user.id,
        action: RegistrationAction.LOGIN_BLOCKED,
        permissionResult: AuditPermissionResult.DENIED,
        outcome: AuditOutcome.BLOCKED,
        failureCategory: LoginBlockReason.REJECTED,
        payload: { email: user.email },
      });
      await blocked('REJECTED');
      throw new ForbiddenException('Your account request was rejected. Please contact support.');
    }

    if (userStatus === 'SUSPENDED') {
      await this.auditService.createAuditEvent({
        resourceType: 'User',
        resourceId: user.id,
        action: RegistrationAction.LOGIN_BLOCKED,
        permissionResult: AuditPermissionResult.DENIED,
        outcome: AuditOutcome.BLOCKED,
        failureCategory: LoginBlockReason.SUSPENDED,
        payload: { email: user.email },
      });
      await blocked('SUSPENDED');
      throw new ForbiddenException('Your account has been suspended. Please contact support.');
    }

    // DISABLED / ARCHIVED (legacy path) and any unknown status
    if (userStatus === 'DISABLED' || userStatus === 'ARCHIVED') {
      await blocked(userStatus);
      throw new ForbiddenException('Account is disabled');
    }

    // APPROVED and ACTIVE are both valid for login
    if (!allowedStatuses.includes(userStatus)) {
      await blocked('STATUS_NOT_ALLOWED');
      throw new ForbiddenException('Account access denied');
    }

    // Filter to ACTIVE memberships in code — defensive against any Prisma enum quirk
    const activeMemberships = user.memberships.filter((m) => m.status === 'ACTIVE');

    let membership = activeMemberships[0];
    if (tenantSlug) {
      const selected = activeMemberships.find((m) => m.tenant.slug === tenantSlug);
      // An explicit credential-based login can select an ACTIVE membership
      // (even without in-session switching rights). This preserves legitimate
      // multi-membership logins; it never creates access to an unjoined tenant.
      // The authenticated switch endpoint separately enforces switch grants.
      if (!selected) {
        await blocked('COMPANY_ACCESS_DENIED');
        throw new ForbiddenException('Company access denied');
      }
      membership = selected;
    }

    if (!membership) {
      await blocked('NO_ACTIVE_MEMBERSHIP');
      throw new ForbiddenException(
        'Your account is approved but has no active workspace membership. Contact your administrator.',
      );
    }
    if (membership.tenant.status !== 'ACTIVE') {
      await this.loginHistory.record({ ...attempt, outcome: 'BLOCKED', reason: 'TENANT_SUSPENDED', userId: user.id, tenantId: membership.tenantId });
      throw new ForbiddenException('Tenant is suspended');
    }

    const tokens = await this.createSession(
      user.id,
      user.email,
      membership.tenantId,
      membership.tenant.slug,
      membership.role,
    );

    await this.loginHistory.record({ ...attempt, outcome: 'SUCCESS', userId: user.id, tenantId: membership.tenantId });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: membership.role,
      },
      tenant: {
        id: membership.tenant.id,
        name: membership.tenant.name,
        slug: membership.tenant.slug,
      },
      tokens,
    };
  }

  // ── Bootstrap Owner (first-setup only) ────────────────────────────────────

  async bootstrapOwner(dto: BootstrapOwnerDto): Promise<{
    message: string;
    tenantSlug: string;
  }> {
    // Block if any Owner membership already exists anywhere in the system.
    // This endpoint is strictly for initial system setup.
    const existingOwner = await this.prisma.tenantMembership.findFirst({
      where: { role: 'OWNER' },
      select: { id: true },
    });

    if (existingOwner) {
      throw new ForbiddenException(
        'An Owner account already exists. Bootstrap is only available during initial setup.',
      );
    }

    // Verify slug is not taken
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug },
      select: { id: true },
    });
    if (existingTenant) {
      throw new ConflictException('Tenant slug is already taken.');
    }

    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true },
    });
    if (existingEmail) {
      throw new ConflictException('Email is already registered.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create tenant + owner user + owner membership in one transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: dto.tenantName, slug: dto.tenantSlug, status: 'ACTIVE' },
      });

      const user = await (tx as any).user.create({
        data: {
          email: dto.email.toLowerCase(),
          displayName: dto.fullName,
          passwordHash,
          status: 'APPROVED' as any,
        },
      }) as { id: string; email: string; displayName: string | null };

      const membership = await (tx as any).tenantMembership.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: 'OWNER',
          status: 'ACTIVE',
          visibilityScope: 'TENANT_WIDE' as any,
        },
      }) as { id: string };

      return { tenant, user, membership };
    });

    await this.auditService.createAuditEvent({
      tenantId: result.tenant.id,
      actorId: result.user.id,
      actorRole: 'OWNER' as any,
      resourceType: 'Tenant',
      resourceId: result.tenant.id,
      action: 'bootstrap.owner.created',
      permissionResult: AuditPermissionResult.NOT_EVALUATED,
      outcome: AuditOutcome.SUCCESS,
    });

    return {
      message: 'Owner account and tenant created successfully.',
      tenantSlug: result.tenant.slug,
    };
  }

  // ── Refresh Token ──────────────────────────────────────────────────────────

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(refreshToken);

    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            memberships: { where: { status: 'ACTIVE' }, include: { tenant: true } },
          },
        },
        tenant: true,
      },
    });

    if (!session || session.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid or expired session');
    }

    if (session.expiresAt < new Date()) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { status: 'EXPIRED' },
      });
      throw new UnauthorizedException('Session expired');
    }

    const membership = session.user.memberships.find((m) => m.tenantId === session.tenantId);
    if (!membership || !allowedStatuses.includes(session.user.status as string)) {
      await this.prisma.session.updateMany({
        where: { id: session.id, status: 'ACTIVE' },
        data: { status: 'REVOKED', revokedAt: new Date() },
      });
      throw new UnauthorizedException('Invalid or expired session');
    }

    const newRefreshToken = crypto.randomBytes(48).toString('hex');
    const newHash = this.hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.session.update({
      where: { id: session.id },
      data: { tokenHash: newHash, expiresAt, lastSeenAt: new Date() },
    });

    const payload: JwtPayload = {
      sub: session.userId,
      email: session.user.email,
      tenantId: session.tenantId,
      tenantSlug: session.tenant.slug,
      role: membership.role,
      sessionId: session.id,
    };

    const accessToken = this.jwtService.sign(payload);
    return { accessToken, refreshToken: newRefreshToken, expiresIn: this.getExpiresInSeconds() };
  }

  // ── Company switching (tenant-isolated, opt-in for non-managers) ───────────
  // Existing MembershipPermission is reused: action=switch, resource=tenant.
  // No new roles or database migrations. Never trust a tenant id from a header.
  private companySwitchAllowed(membership: { role: string; permissions?: { granted: boolean }[] }): boolean {
    if (membership.role === 'OWNER') return true;
    const override = membership.permissions?.[0];
    if (override) return override.granted;
    return membership.role === 'MANAGER';
  }

  private async companyAccessContext(actor: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: actor.sub },
      select: {
        id: true,
        email: true,
        displayName: true,
        status: true,
        memberships: {
          select: {
            id: true, tenantId: true, role: true, status: true,
            tenant: { select: { id: true, name: true, slug: true, status: true } },
            permissions: {
              where: { action: 'switch', resource: 'tenant' },
              select: { granted: true },
            },
          },
        },
      },
    });
    if (!user || !allowedStatuses.includes(user.status as string)) {
      throw new ForbiddenException('Company access denied');
    }
    const current = user.memberships.find(
      (m) => m.tenantId === actor.tenantId && m.status === 'ACTIVE' && m.tenant.status === 'ACTIVE',
    );
    if (!current || current.role !== actor.role) {
      throw new ForbiddenException('Company access denied');
    }
    return { user, current };
  }

  async availableCompanies(actor: JwtPayload) {
    const { user, current } = await this.companyAccessContext(actor);
    const canSwitch = this.companySwitchAllowed(current);
    const candidates = canSwitch
      ? user.memberships.filter(
          (m) => m.status === 'ACTIVE' && m.tenant.status === 'ACTIVE' &&
            this.companySwitchAllowed(m),
        )
      : [current];
    // Every name in this response is authorized; never return all tenants.
    const companies = candidates.map((m) => ({
      id: m.tenant.id, name: m.tenant.name, slug: m.tenant.slug, role: m.role,
    }));
    return { currentTenantId: current.tenantId, canSwitch: canSwitch && companies.length > 1, companies };
  }

  async switchCompany(actor: JwtPayload, targetTenantId: string) {
    if (!targetTenantId || targetTenantId === actor.tenantId) {
      throw new BadRequestException('Choose a different authorized company');
    }
    const { user, current } = await this.companyAccessContext(actor);
    const target = user.memberships.find(
      (m) => m.tenantId === targetTenantId && m.status === 'ACTIVE' &&
        m.tenant.status === 'ACTIVE',
    );
    if (!this.companySwitchAllowed(current) || !target || !this.companySwitchAllowed(target)) {
      throw new ForbiddenException('Company access denied');
    }
    // Atomic rotation: old JWT's session becomes revoked and cannot access its
    // previous tenant; the new JWT is bound to the target ACTIVE membership.
    const tokens = await this.createSession(
      user.id, user.email, target.tenantId, target.tenant.slug, target.role, actor.sessionId,
    );
    await this.auditService.createAuditEvent({
      tenantId: actor.tenantId,
      actorId: user.id,
      actorRole: current.role,
      sessionId: actor.sessionId,
      resourceType: 'Tenant',
      resourceId: target.tenantId,
      action: 'tenant.switch',
      permissionResult: AuditPermissionResult.ALLOWED,
      outcome: AuditOutcome.SUCCESS,
      payload: { fromTenantId: actor.tenantId, toTenantId: target.tenantId },
    }).catch((err: unknown) => this.logger.error('Could not record company switch audit event', err));
    return {
      tokens,
      user: { id: user.id, email: user.email, displayName: user.displayName, role: target.role },
      tenant: { id: target.tenant.id, name: target.tenant.name, slug: target.tenant.slug },
    };
  }

  private async requireCurrentOwner(actor: JwtPayload) {
    const membership = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId: actor.tenantId, userId: actor.sub } },
      select: { id: true, role: true, status: true },
    });
    if (!membership || membership.role !== 'OWNER' || membership.status !== 'ACTIVE') {
      throw new ForbiddenException('Only the company owner can manage company-switch permissions');
    }
  }

  async companyMembers(actor: JwtPayload) {
    await this.requireCurrentOwner(actor);
    const members = await this.prisma.tenantMembership.findMany({
      where: { tenantId: actor.tenantId },
      select: {
        userId: true, role: true, status: true,
        user: { select: { email: true, displayName: true } },
        permissions: { select: { action: true, resource: true, granted: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return members.map((m) => {
      const switchRow = m.permissions.filter((p) => p.action === 'switch' && p.resource === 'tenant');
      return {
        userId: m.userId, role: m.role, status: m.status,
        displayName: m.user.displayName, email: m.user.email,
        canSwitch: this.companySwitchAllowed({ role: m.role, permissions: switchRow }),
        explicitGrant: switchRow[0]?.granted ?? null,
        // Explicit per-company grants the OWNER can change, for the roles they apply to.
        grants: Object.fromEntries(EXPLICIT_GRANT_KEYS
          .filter((g) => (EXPLICIT_GRANTS[g].roles as readonly string[]).includes(m.role))
          .map((g) => [g, hasGrant(m.permissions, g)])),
      };
    });
  }

  async setCompanySwitchPermission(actor: JwtPayload, targetUserId: string, enabled: boolean) {
    await this.requireCurrentOwner(actor);
    const target = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId: actor.tenantId, userId: targetUserId } },
      select: { id: true, role: true, status: true },
    });
    if (!target || target.status !== 'ACTIVE' || target.role === 'OWNER') {
      throw new ForbiddenException('Cannot change company-switch permission for this member');
    }
    await this.prisma.membershipPermission.upsert({
      where: {
        membershipId_action_resource: {
          membershipId: target.id, action: 'switch', resource: 'tenant',
        },
      },
      create: {
        membershipId: target.id, action: 'switch', resource: 'tenant', granted: enabled,
      },
      update: { granted: enabled },
    });
    await this.auditService.createAuditEvent({
      tenantId: actor.tenantId,
      actorId: actor.sub, actorRole: 'OWNER',
      sessionId: actor.sessionId,
      resourceType: 'TenantMembership', resourceId: target.id,
      action: 'tenant.switch_permission_updated',
      permissionResult: AuditPermissionResult.ALLOWED,
      outcome: AuditOutcome.SUCCESS,
      payload: { enabled },
    }).catch((err: unknown) => this.logger.error('Could not record switch permission audit event', err));
    return { userId: targetUserId, enabled };
  }

  /**
   * The caller's explicit grants in the active company, for showing the right
   * navigation and actions. The API still checks every request on its own.
   */
  async myGrants(actor: JwtPayload) {
    const m = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId: actor.tenantId, userId: actor.sub } },
      select: { role: true, status: true, permissions: { select: { action: true, resource: true, granted: true } } },
    });
    if (!m || m.status !== 'ACTIVE') throw new ForbiddenException('Company access denied');
    const applicable = EXPLICIT_GRANT_KEYS.filter((g) => (EXPLICIT_GRANTS[g].roles as readonly string[]).includes(m.role));
    return { role: m.role, grants: Object.fromEntries(applicable.map((g) => [g, hasGrant(m.permissions, g)])) };
  }

  /** OWNER grants or removes an explicit grant (explicit-grants.ts) for a member of the active company. */
  async setMemberGrant(actor: JwtPayload, targetUserId: string, grant: ExplicitGrant, enabled: boolean) {
    await this.requireCurrentOwner(actor);
    const target = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId: actor.tenantId, userId: targetUserId } },
      select: { id: true, role: true, status: true, permissions: { select: { action: true, resource: true, granted: true } } },
    });
    if (!target || target.status !== 'ACTIVE' || !(EXPLICIT_GRANTS[grant].roles as readonly string[]).includes(target.role)) {
      throw new ForbiddenException('This permission cannot be changed for this member');
    }
    await this.prisma.$transaction(rowsAfterChange(target.permissions, target.role, grant, enabled).map((row) =>
      this.prisma.membershipPermission.upsert({
        where: { membershipId_action_resource: { membershipId: target.id, action: row.action, resource: row.resource } },
        create: { membershipId: target.id, action: row.action, resource: row.resource, granted: row.granted },
        update: { granted: row.granted },
      })));
    await this.auditService.createAuditEvent({
      tenantId: actor.tenantId,
      actorId: actor.sub, actorRole: 'OWNER',
      sessionId: actor.sessionId,
      resourceType: 'TenantMembership', resourceId: target.id,
      action: 'membership.grant_updated',
      permissionResult: AuditPermissionResult.ALLOWED,
      outcome: AuditOutcome.SUCCESS,
      payload: { grant, enabled },
    }).catch((err: unknown) => this.logger.error('Could not record grant audit event', err));
    return { userId: targetUserId, grant, enabled };
  }

  /**
   * OWNER removes a member from the active company only. The account and its
   * other companies stay; this company's permissions are deleted and its
   * sessions revoked, so access ends at once (validateSession also refuses a
   * membership that is not ACTIVE). Owners, the caller included, are never
   * removed here, so the company always keeps its Owner.
   */
  async removeMember(actor: JwtPayload, targetUserId: string) {
    await this.requireCurrentOwner(actor);
    const target = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId: actor.tenantId, userId: targetUserId } },
      select: { id: true, role: true, status: true },
    });
    if (!target || target.status === 'REMOVED') throw new NotFoundException('No member with this id in this company');
    if (target.role === 'OWNER') throw new ForbiddenException('Owners cannot be removed from the company');
    const [, permissions, sessions] = await this.prisma.$transaction([
      this.prisma.tenantMembership.update({ where: { id: target.id }, data: { status: 'REMOVED' } }),
      this.prisma.membershipPermission.deleteMany({ where: { membershipId: target.id } }),
      this.prisma.session.updateMany({
        where: { tenantId: actor.tenantId, userId: targetUserId, status: 'ACTIVE' },
        data: { status: 'REVOKED', revokedAt: new Date() },
      }),
    ]);
    await this.auditService.createAuditEvent({
      tenantId: actor.tenantId,
      actorId: actor.sub, actorRole: 'OWNER',
      sessionId: actor.sessionId,
      resourceType: 'TenantMembership', resourceId: target.id,
      action: 'membership.removed',
      permissionResult: AuditPermissionResult.ALLOWED,
      outcome: AuditOutcome.SUCCESS,
      payload: { role: target.role, previousStatus: target.status, permissionsCleared: permissions.count, sessionsRevoked: sessions.count },
    }).catch((err: unknown) => this.logger.error('Could not record member removal audit event', err));
    return { userId: targetUserId, status: 'REMOVED' as const };
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  async logout(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });
  }

  async logoutAll(userId: string, tenantId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, tenantId, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });
  }

  // ── Session validation (used by JWT strategy) ──────────────────────────────

  async validateSession(sessionId: string, expected?: Pick<JwtPayload, 'sub' | 'tenantId'>): Promise<string | false> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        status: true,
        expiresAt: true,
        tenantId: true,
        userId: true,
        tenant: { select: { status: true } },
        user: { select: { status: true, memberships: { select: { tenantId: true, status: true, role: true } } } },
      },
    });
    if (!session || session.status !== 'ACTIVE' || session.expiresAt < new Date()) {
      return false;
    }
    // A session is only as valid as the user and the membership behind it:
    // a suspended, disabled or archived user, or a membership that is no
    // longer ACTIVE in the session's tenant, loses access on the next request.
    if (!allowedStatuses.includes(session.user.status as string) || session.tenant.status !== 'ACTIVE') {
      return false;
    }
    const membership = session.user.memberships.find((m) => m.tenantId === session.tenantId);
    if (!membership || membership.status !== 'ACTIVE' ||
      (expected && (expected.sub !== session.userId || expected.tenantId !== session.tenantId))) {
      return false;
    }
    void this.prisma.session.update({
      where: { id: sessionId },
      data: { lastSeenAt: new Date() },
    });
    // JWT role may be stale after an OWNER-approved role change. Always return
    // the live DB role; revocation/suspension still fails closed above.
    return membership.role;
  }

  // ── Set password (invite flow) ─────────────────────────────────────────────

  async setPassword(userId: string, password: string): Promise<void> {
    const hash = await bcrypt.hash(password, 12);
    await (this.prisma as any).user.update({
      where: { id: userId },
      data: { passwordHash: hash, status: 'ACTIVE' },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async createSession(
    userId: string,
    email: string,
    tenantId: string,
    tenantSlug: string,
    role: string,
    replaceSessionId?: string,
  ): Promise<AuthTokens> {
    const refreshToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session = replaceSessionId
      ? await this.prisma.$transaction(async (tx) => {
          const created = await tx.session.create({
            data: { userId, tenantId, tokenHash, expiresAt, status: 'ACTIVE' },
          });
          const previous = await tx.session.updateMany({
            where: { id: replaceSessionId, userId, status: 'ACTIVE' },
            data: { status: 'REVOKED', revokedAt: new Date() },
          });
          if (previous.count !== 1) throw new UnauthorizedException('Session expired');
          return created;
        })
      : await this.prisma.session.create({
          data: { userId, tenantId, tokenHash, expiresAt, status: 'ACTIVE' },
        });

    const payload: JwtPayload = {
      sub: userId,
      email,
      tenantId,
      tenantSlug,
      role,
      sessionId: session.id,
    };

    const accessToken = this.jwtService.sign(payload);
    return { accessToken, refreshToken, expiresIn: this.getExpiresInSeconds() };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private getExpiresInSeconds(): number {
    const raw = this.config.get<string>('JWT_EXPIRES_IN', '15m');
    const match = /^(\d+)([smhd])$/.exec(raw);
    if (!match) return 900;
    const mult: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return Number(match[1]) * (mult[match[2]] ?? 60);
  }
}
