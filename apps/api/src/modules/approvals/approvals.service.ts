import { Injectable } from '@nestjs/common';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantContext } from '../../common/tenant/tenant-context';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { ApprovalDecisionRecord, ApprovalRequestRecord, ApprovalsRepository } from './approvals.repository';
import { CreateApprovalDecisionDto } from './dto/create-approval-decision.dto';
import { CreateApprovalRequestDto } from './dto/create-approval-request.dto';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly approvalsRepository: ApprovalsRepository,
    private readonly resourceScopeService: ResourceScopeService,
    private readonly auditService: AuditService,
  ) {}

  listApprovals(context: TenantContext) {
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });

    return this.approvalsRepository.list(context);
  }

  createApproval(
    context: TenantContext,
    actor: ActorContext | undefined,
    dto: CreateApprovalRequestDto,
  ) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    const approval = this.approvalsRepository.create(context, actor, dto);
    return {
      approval,
      auditEvent: this.recordApprovalAudit(context, actor, approval),
    };
  }

  getApproval(context: TenantContext, id: string) {
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });

    return this.approvalsRepository.getById(context, id);
  }

  createDecision(
    context: TenantContext,
    actor: ActorContext | undefined,
    id: string,
    dto: CreateApprovalDecisionDto,
  ) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    const decision = this.approvalsRepository.createDecision(context, actor, id, dto);
    return {
      decision,
      auditEvent: this.recordDecisionAudit(context, actor, decision),
    };
  }

  private recordApprovalAudit(
    context: TenantContext,
    actor: ActorContext | undefined,
    approval: ApprovalRequestRecord,
  ) {
    return this.auditService.createAuditEventPlaceholder({
      action: 'approval.requested',
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId: approval.id,
      resourceType: 'approval',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: {
        approvalId: approval.id,
        clientVisible: approval.clientVisible,
        fileAssetId: approval.fileAssetId,
        fileVersionId: approval.fileVersionId,
      },
    });
  }

  private recordDecisionAudit(
    context: TenantContext,
    actor: ActorContext | undefined,
    decision: ApprovalDecisionRecord,
  ) {
    return this.auditService.createAuditEventPlaceholder({
      action: 'approval.decision_recorded',
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId: decision.approvalRequestId,
      resourceType: 'approval',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: {
        approvalRequestId: decision.approvalRequestId,
        decision: decision.decision,
        decisionId: decision.id,
      },
    });
  }
}
