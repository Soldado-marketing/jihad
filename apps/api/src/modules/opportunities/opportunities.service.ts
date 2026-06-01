import { Injectable } from '@nestjs/common';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantContext } from '../../common/tenant/tenant-context';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { OpportunitiesRepository, OpportunityRecord } from './opportunities.repository';

@Injectable()
export class OpportunitiesService {
  constructor(
    private readonly opportunitiesRepository: OpportunitiesRepository,
    private readonly resourceScopeService: ResourceScopeService,
    private readonly auditService: AuditService,
  ) {}

  listOpportunities(context: TenantContext) {
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });

    return this.opportunitiesRepository.list(context);
  }

  createOpportunity(
    context: TenantContext,
    actor: ActorContext | undefined,
    dto: CreateOpportunityDto,
  ) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    const opportunity = this.opportunitiesRepository.create(context, actor, dto);
    return {
      opportunity,
      auditEvent: this.recordAudit(context, actor, opportunity, 'opportunity.created'),
    };
  }

  getOpportunity(context: TenantContext, id: string) {
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });

    return this.opportunitiesRepository.getById(context, id);
  }

  updateOpportunity(
    context: TenantContext,
    actor: ActorContext | undefined,
    id: string,
    dto: UpdateOpportunityDto,
  ) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    const opportunity = this.opportunitiesRepository.update(context, actor, id, dto);
    return {
      opportunity,
      auditEvent: this.recordAudit(context, actor, opportunity, 'opportunity.updated'),
    };
  }

  private recordAudit(
    context: TenantContext,
    actor: ActorContext | undefined,
    opportunity: OpportunityRecord,
    action: 'opportunity.created' | 'opportunity.updated',
  ) {
    return this.auditService.createAuditEventPlaceholder({
      action,
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId: opportunity.id,
      resourceType: 'opportunity',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: { opportunity },
    });
  }
}
