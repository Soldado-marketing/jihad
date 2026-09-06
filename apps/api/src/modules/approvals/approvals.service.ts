import { Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { ApprovalsRepository } from './approvals.repository';
import { CreateApprovalRequestDto } from './dto/create-approval-request.dto';
import { CreateApprovalDecisionDto } from './dto/create-approval-decision.dto';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly repo: ApprovalsRepository,
    private readonly notifications: NotificationsService,
  ) {}

  list(tenantId: string) { return this.repo.list(tenantId); }
  async create(tenantId: string, actorId: string, dto: CreateApprovalRequestDto) {
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
    const decision = await this.repo.createDecision(tenantId, actorId, id, dto);

    // Back to whoever asked. Keyed on the decision id, so one decision is one
    // notification however many times the request is replayed.
    await this.notifications.notify({
      tenantId,
      recipientUserIds: approval.requestedByUserId ? [approval.requestedByUserId] : [],
      audience: 'INTERNAL',
      actorUserId: actorId,
      dedupeKey: `approval.decided:${decision.id}`,
      title: `Approval ${dto.decision.toLowerCase().replace(/_/g, ' ')}`,
      body: approval.title,
      resourceType: 'approval',
      resourceId: id,
    });

    return decision;
  }
}
