import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { assertFileAssetInTenant, assertFileVersionInTenant } from '../../common/tenant/tenant-references';
import { NotificationsService } from '../notifications/notifications.service';
import { PermissionService } from '../permissions/permission.service';
import { PrismaService } from '../prisma/prisma.service';
import { ApprovalClosedError, ApprovalsRepository } from './approvals.repository';
import { CreateApprovalRequestDto } from './dto/create-approval-request.dto';
import { CreateApprovalDecisionDto } from './dto/create-approval-decision.dto';

/** Notification titles per decision (the enum values read badly as text). */
const DECISION_TITLES: Record<string, string> = {
  APPROVE: 'Approval approved',
  REJECT: 'Approval rejected',
  REQUEST_CHANGES: 'Changes requested on approval',
  CANCEL: 'Approval cancelled',
};

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly repo: ApprovalsRepository,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly permissions: PermissionService,
  ) {}

  list(tenantId: string) { return this.repo.list(tenantId); }

  /** What the caller may do in the queue: only explicit approvers decide. */
  async me(tenantId: string, actorId: string) {
    return { canDecide: await this.permissions.mayDecideApprovals(tenantId, actorId) };
  }
  async create(tenantId: string, actorId: string, dto: CreateApprovalRequestDto) {
    await assertFileAssetInTenant(this.prisma, tenantId, dto.fileAssetId);
    await assertFileVersionInTenant(this.prisma, tenantId, dto.fileVersionId, dto.fileAssetId);
    const approval = await this.repo.create(tenantId, actorId, dto);

    // The people who can decide it. Internal-only: approving is staff work.
    await this.notifications.notify({
      tenantId,
      recipientRoles: [MembershipRole.OWNER, MembershipRole.MANAGER],
      audience: 'INTERNAL',
      actorUserId: actorId,
      dedupeKey: `approval.requested:${approval.id}`,
      title: 'Approval requested',
      body: approval.title,
      resourceType: 'approval',
      resourceId: approval.id,
    });

    return approval;
  }

  async get(tenantId: string, id: string) {
    const item = await this.repo.getById(tenantId, id);
    if (!item) throw new NotFoundException('Approval not found');
    return item;
  }

  async decide(tenantId: string, actorId: string, id: string, dto: CreateApprovalDecisionDto) {
    const approval = await this.get(tenantId, id);
    // The OWNER, or a member the OWNER made an approver (explicit-grants.ts).
    // Reading the queue alone, or being allowed to request approvals, is not enough.
    if (!(await this.permissions.mayDecideApprovals(tenantId, actorId))) {
      throw new ForbiddenException({ code: 'FORBIDDEN', reason: 'not_an_approver' });
    }
    let decision;
    try {
      decision = await this.repo.createDecision(tenantId, actorId, id, dto);
    } catch (error) {
      if (error instanceof ApprovalClosedError) {
        throw new ConflictException({
          code: 'APPROVAL_ALREADY_DECIDED',
          reason: `This approval is already ${error.status.toLowerCase().replace(/_/g, ' ')}.`,
        });
      }
      throw error;
    }

    // Back to whoever asked. Keyed on the decision id, so one decision is one
    // notification however many times the request is replayed.
    await this.notifications.notify({
      tenantId,
      recipientUserIds: approval.requestedByUserId ? [approval.requestedByUserId] : [],
      audience: 'INTERNAL',
      actorUserId: actorId,
      dedupeKey: `approval.decided:${decision.id}`,
      title: DECISION_TITLES[dto.decision] ?? 'Approval decided',
      body: approval.title,
      resourceType: 'approval',
      resourceId: id,
    });

    return decision;
  }
}
