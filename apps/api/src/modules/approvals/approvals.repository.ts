import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantAwareRepository } from '../../common/repositories/tenant-aware.repository';
import { TenantContext } from '../../common/tenant/tenant-context';
import { CreateApprovalDecisionDto } from './dto/create-approval-decision.dto';
import { CreateApprovalRequestDto } from './dto/create-approval-request.dto';

export type ApprovalStatusValue =
  | 'DRAFT'
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED'
  | 'CANCELED';

export type ApprovalRequestRecord = {
  id: string;
  tenantId: string;
  fileAssetId?: string;
  fileVersionId?: string;
  title: string;
  status: ApprovalStatusValue;
  requestedByUserId?: string;
  clientVisible: boolean;
  clientScopeKey?: string;
  dueAt?: string;
  sourceType: 'sprint-6-placeholder';
};

export type ApprovalDecisionRecord = {
  id: string;
  tenantId: string;
  approvalRequestId: string;
  decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'CANCEL';
  note?: string;
  decidedByUserId?: string;
  sourceType: 'sprint-6-placeholder';
};

@Injectable()
export class ApprovalsRepository extends TenantAwareRepository {
  list(context: TenantContext): ApprovalRequestRecord[] {
    const tenant = this.requireTenantContext(context);

    return [this.placeholderApproval(tenant.tenantId)];
  }

  create(
    context: TenantContext,
    actor: ActorContext | undefined,
    dto: CreateApprovalRequestDto,
  ): ApprovalRequestRecord {
    const tenant = this.requireTenantContext(context);

    return {
      clientScopeKey: dto.clientScopeKey,
      clientVisible: Boolean(dto.clientScopeKey),
      dueAt: dto.dueAt,
      fileAssetId: dto.fileAssetId,
      fileVersionId: dto.fileVersionId,
      id: randomUUID(),
      requestedByUserId: actor?.actorId,
      sourceType: 'sprint-6-placeholder',
      status: 'REQUESTED',
      tenantId: tenant.tenantId,
      title: dto.title,
    };
  }

  getById(context: TenantContext, id: string): ApprovalRequestRecord {
    const tenant = this.requireTenantContext(context);

    return {
      ...this.placeholderApproval(tenant.tenantId),
      id,
    };
  }

  createDecision(
    context: TenantContext,
    actor: ActorContext | undefined,
    approvalRequestId: string,
    dto: CreateApprovalDecisionDto,
  ): ApprovalDecisionRecord {
    const tenant = this.requireTenantContext(context);

    return {
      approvalRequestId,
      decidedByUserId: actor?.actorId,
      decision: dto.decision,
      id: randomUUID(),
      note: dto.note,
      sourceType: 'sprint-6-placeholder',
      tenantId: tenant.tenantId,
    };
  }

  private placeholderApproval(tenantId: string): ApprovalRequestRecord {
    return {
      clientVisible: false,
      fileAssetId: 'sprint-6-file-placeholder',
      fileVersionId: 'sprint-6-file-version-placeholder',
      id: 'sprint-6-approval-placeholder',
      sourceType: 'sprint-6-placeholder',
      status: 'REQUESTED',
      tenantId,
      title: 'Sprint 6 Approval Placeholder',
    };
  }
}
