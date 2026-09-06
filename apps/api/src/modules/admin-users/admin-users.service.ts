import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import {
  AuditOutcome,
  AuditPermissionResult,
  RegistrationAction,
} from '../audit/audit.types';
import { ApproveRequestDto } from './dto/approve-request.dto';
import { RejectRequestDto } from './dto/reject-request.dto';
import { ChangeRoleDto } from './dto/change-role.dto';

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly mailService: MailService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Verify that the calling user is an OWNER in the given tenant.
   * Loads from DB — does NOT trust JWT role field alone.
   */
  private async requireOwner(actorId: string, tenantId: string): Promise<void> {
    const membership = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId: actorId } },
      select: { role: true, status: true },
    });

    if (!membership || membership.status !== 'ACTIVE' || membership.role !== 'OWNER') {
      throw new ForbiddenException('Only Owners can perform this action.');
    }
  }

  // ── List pending registration requests ────────────────────────────────────

  async getPendingRequests(actorId: string, tenantId: string) {
    await this.requireOwner(actorId, tenantId);

    return (this.prisma as any).registrationRequest.findMany({
      where: { tenantId, status: 'PENDING' },
      include: {
        user: { select: { id: true, email: true, displayName: true, createdAt: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getAllRequests(
    actorId: string,
    tenantId: string,
    status?: 'PENDING' | 'APPROVED' | 'REJECTED',
  ) {
    await this.requireOwner(actorId, tenantId);

    return (this.prisma as any).registrationRequest.findMany({
      where: { tenantId, ...(status ? { status } : {}) as object },
      include: {
        user: { select: { id: true, email: true, displayName: true, status: true, createdAt: true } },
        reviewedBy: { select: { id: true, email: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Approve request ────────────────────────────────────────────────────────

  async approveRequest(
    requestId: string,
    dto: ApproveRequestDto,
    actorId: string,
    tenantId: string,
  ) {
    await this.requireOwner(actorId, tenantId);

    const regRequest = await (this.prisma as any).registrationRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!regRequest) throw new NotFoundException('Registration request not found.');
    if (regRequest.tenantId !== tenantId) throw new ForbiddenException('Request is not in your tenant.');
    if (regRequest.status !== 'PENDING') {
      throw new ForbiddenException(`Request has already been ${regRequest.status.toLowerCase()}.`);
    }

    const reviewedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      // 1. Update user status to APPROVED
      await (tx as any).user.update({
        where: { id: regRequest.userId },
        data: { status: 'APPROVED' as any },
      });

      // 2. Create TenantMembership with role + scope
      const membership = await (tx as any).tenantMembership.create({
        data: {
          tenantId,
          userId: regRequest.userId,
          role: dto.role as any,
          status: 'ACTIVE',
          visibilityScope: dto.visibilityScope as any,
        },
      });

      // 3. Create MembershipPermission rows if provided
      if (dto.permissions && dto.permissions.length > 0) {
        await (tx as any).membershipPermission.createMany({
          data: dto.permissions.map((p) => ({
            membershipId: membership.id,
            action: p.action,
            resource: p.resource,
            granted: true,
          })),
          skipDuplicates: true,
        });
      }

      // 4. Update registration request status
      await (tx as any).registrationRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          adminNote: dto.adminNote ?? null,
          reviewedByUserId: actorId,
          reviewedAt,
        },
      });
    });

    // Persist audit events — best-effort: a DB failure here must NOT hide a successful approval.
    // The transaction already committed; the user IS approved and can log in regardless.
    try {
      const actorMembership = await this.prisma.tenantMembership.findUnique({
        where: { tenantId_userId: { tenantId, userId: actorId } },
        select: { role: true },
      });
      const actorRole = (actorMembership?.role ?? 'OWNER') as any;

      await Promise.all([
        this.auditService.createAuditEvent({
          tenantId,
          actorId,
          actorRole,
          resourceType: 'RegistrationRequest',
          resourceId: requestId,
          action: RegistrationAction.APPROVED,
          permissionResult: AuditPermissionResult.ALLOWED,
          outcome: AuditOutcome.SUCCESS,
          payload: { userId: regRequest.userId, role: dto.role },
        }),
        this.auditService.createAuditEvent({
          tenantId,
          actorId,
          actorRole,
          resourceType: 'TenantMembership',
          resourceId: regRequest.userId,
          action: RegistrationAction.ROLE_ASSIGNED,
          permissionResult: AuditPermissionResult.ALLOWED,
          outcome: AuditOutcome.SUCCESS,
          payload: { role: dto.role },
        }),
        this.auditService.createAuditEvent({
          tenantId,
          actorId,
          actorRole,
          resourceType: 'TenantMembership',
          resourceId: regRequest.userId,
          action: RegistrationAction.PERMISSIONS_ASSIGNED,
          permissionResult: AuditPermissionResult.ALLOWED,
          outcome: AuditOutcome.SUCCESS,
          payload: { permissionCount: dto.permissions?.length ?? 0 },
        }),
        this.auditService.createAuditEvent({
          tenantId,
          actorId,
          actorRole,
          resourceType: 'TenantMembership',
          resourceId: regRequest.userId,
          action: RegistrationAction.SCOPE_ASSIGNED,
          permissionResult: AuditPermissionResult.ALLOWED,
          outcome: AuditOutcome.SUCCESS,
          payload: { visibilityScope: dto.visibilityScope },
        }),
      ]);
    } catch (auditErr: unknown) {
      // Audit failure is non-fatal — user was approved; log and continue
      this.logger.warn(
        `Audit events failed after approval (user still approved): ${String(auditErr)}`,
      );
    }

    // Notify requester — best-effort, fire-and-forget
    this.mailService.sendApprovalEmail({
      to: (regRequest.user as { email: string }).email,
      name: regRequest.fullName as string,
    });

    // In-app version of the same news. DIRECT, because this recipient may well
    // be a CLIENT and it is their own account event — nothing internal leaks.
    await this.notifications.notify({
      tenantId,
      recipientUserIds: [regRequest.userId],
      audience: 'DIRECT',
      dedupeKey: `registration.approved:${requestId}`,
      title: 'Your access request was approved',
      body: 'You can now sign in to the workspace.',
      resourceType: 'registrationRequest',
      resourceId: requestId,
    });

    return { message: 'User approved successfully.' };
  }

  // ── Reject request ─────────────────────────────────────────────────────────

  async rejectRequest(
    requestId: string,
    dto: RejectRequestDto,
    actorId: string,
    tenantId: string,
  ) {
    await this.requireOwner(actorId, tenantId);

    const regRequest = await (this.prisma as any).registrationRequest.findUnique({
      where: { id: requestId },
      include: { user: { select: { email: true } } },
    });

    if (!regRequest) throw new NotFoundException('Registration request not found.');
    if (regRequest.tenantId !== tenantId) throw new ForbiddenException('Request is not in your tenant.');
    if (regRequest.status !== 'PENDING') {
      throw new ForbiddenException(`Request has already been ${regRequest.status.toLowerCase()}.`);
    }

    await this.prisma.$transaction(async (tx) => {
      await (tx as any).user.update({
        where: { id: regRequest.userId },
        data: { status: 'REJECTED' as any },
      });

      await (tx as any).registrationRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          rejectionReason: dto.rejectionReason,
          reviewedByUserId: actorId,
          reviewedAt: new Date(),
        },
      });
    });

    const actorMembership = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId: actorId } },
      select: { role: true },
    });

    await this.auditService.createAuditEvent({
      tenantId,
      actorId,
      actorRole: (actorMembership?.role ?? 'OWNER') as any,
      resourceType: 'RegistrationRequest',
      resourceId: requestId,
      action: RegistrationAction.REJECTED,
      permissionResult: AuditPermissionResult.ALLOWED,
      outcome: AuditOutcome.SUCCESS,
      payload: { userId: regRequest.userId },
    });

    // Notify requester — best-effort, fire-and-forget
    const rejectedUser = (regRequest as { user?: { email: string } }).user;
    if (rejectedUser?.email) {
      this.mailService.sendRejectionEmail({
        to: rejectedUser.email,
        name: regRequest.fullName as string,
      });
    }

    return { message: 'User request rejected.' };
  }

  // ── Suspend user ───────────────────────────────────────────────────────────

  async suspendUser(targetUserId: string, actorId: string, tenantId: string) {
    await this.requireOwner(actorId, tenantId);

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, status: true },
    });

    if (!user) throw new NotFoundException('User not found.');

    // Verify target user has membership in this tenant
    const targetMembership = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId: targetUserId } },
      select: { role: true },
    });
    if (!targetMembership) throw new ForbiddenException('User is not a member of this tenant.');

    // Cannot suspend another Owner
    if (targetMembership.role === 'OWNER') {
      throw new ForbiddenException('Owner accounts cannot be suspended through this endpoint.');
    }

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { status: 'SUSPENDED' as any },
    });

    const actorMembership = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId: actorId } },
      select: { role: true },
    });

    await this.auditService.createAuditEvent({
      tenantId,
      actorId,
      actorRole: (actorMembership?.role ?? 'OWNER') as any,
      resourceType: 'User',
      resourceId: targetUserId,
      action: RegistrationAction.USER_SUSPENDED,
      permissionResult: AuditPermissionResult.ALLOWED,
      outcome: AuditOutcome.SUCCESS,
    });

    return { message: 'User suspended.' };
  }

  // ── Reactivate user ────────────────────────────────────────────────────────

  async reactivateUser(targetUserId: string, actorId: string, tenantId: string) {
    await this.requireOwner(actorId, tenantId);

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, status: true },
    });

    if (!user) throw new NotFoundException('User not found.');

    const targetMembership = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId: targetUserId } },
      select: { id: true },
    });
    if (!targetMembership) throw new ForbiddenException('User is not a member of this tenant.');

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { status: 'APPROVED' as any },
    });

    const actorMembership = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId: actorId } },
      select: { role: true },
    });

    await this.auditService.createAuditEvent({
      tenantId,
      actorId,
      actorRole: (actorMembership?.role ?? 'OWNER') as any,
      resourceType: 'User',
      resourceId: targetUserId,
      action: RegistrationAction.USER_REACTIVATED,
      permissionResult: AuditPermissionResult.ALLOWED,
      outcome: AuditOutcome.SUCCESS,
    });

    return { message: 'User reactivated.' };
  }

  // ── Change role ────────────────────────────────────────────────────────────

  async changeRole(
    targetUserId: string,
    dto: ChangeRoleDto,
    actorId: string,
    tenantId: string,
  ) {
    await this.requireOwner(actorId, tenantId);

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, status: true },
    });

    if (!user) throw new NotFoundException('User not found.');

    const targetMembership = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId: targetUserId } },
      select: { id: true, role: true },
    });

    if (!targetMembership) throw new ForbiddenException('User is not a member of this tenant.');

    if (targetMembership.role === 'OWNER') {
      throw new ForbiddenException('Owner role cannot be changed through this endpoint.');
    }

    const previousRole = targetMembership.role;

    await this.prisma.tenantMembership.update({
      where: { tenantId_userId: { tenantId, userId: targetUserId } },
      data: { role: dto.role as any },
    });

    const actorMembership = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId: actorId } },
      select: { role: true },
    });

    await this.auditService.createAuditEvent({
      tenantId,
      actorId,
      actorRole: (actorMembership?.role ?? 'OWNER') as any,
      resourceType: 'TenantMembership',
      resourceId: targetUserId,
      action: RegistrationAction.ROLE_CHANGED,
      permissionResult: AuditPermissionResult.ALLOWED,
      outcome: AuditOutcome.SUCCESS,
      payload: { previousRole, newRole: dto.role },
    });

    return { message: 'Role updated.' };
  }
}
