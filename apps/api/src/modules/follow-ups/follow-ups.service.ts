import { Injectable } from '@nestjs/common';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantContext } from '../../common/tenant/tenant-context';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { FollowUpRecord, FollowUpsRepository } from './follow-ups.repository';

@Injectable()
export class FollowUpsService {
  constructor(
    private readonly followUpsRepository: FollowUpsRepository,
    private readonly resourceScopeService: ResourceScopeService,
    private readonly auditService: AuditService,
  ) {}

  listFollowUps(context: TenantContext) {
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });

    return this.followUpsRepository.list(context);
  }

  createFollowUp(context: TenantContext, actor: ActorContext | undefined, dto: CreateFollowUpDto) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    const followUp = this.followUpsRepository.create(context, actor, dto);
    return {
      followUp,
      auditEvent: this.recordAudit(context, actor, followUp),
    };
  }

  private recordAudit(
    context: TenantContext,
    actor: ActorContext | undefined,
    followUp: FollowUpRecord,
  ) {
    return this.auditService.createAuditEventPlaceholder({
      action: 'followup.created',
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId: followUp.id,
      resourceType: 'follow-up',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: { followUp },
    });
  }
}
