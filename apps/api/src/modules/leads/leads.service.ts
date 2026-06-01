import { Injectable } from '@nestjs/common';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantContext } from '../../common/tenant/tenant-context';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadRecord, LeadsRepository } from './leads.repository';

@Injectable()
export class LeadsService {
  constructor(
    private readonly leadsRepository: LeadsRepository,
    private readonly resourceScopeService: ResourceScopeService,
    private readonly auditService: AuditService,
  ) {}

  listLeads(context: TenantContext) {
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });

    return this.leadsRepository.list(context);
  }

  createLead(context: TenantContext, actor: ActorContext | undefined, dto: CreateLeadDto) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    const lead = this.leadsRepository.create(context, actor, dto);
    return {
      lead,
      auditEvent: this.recordAudit(context, actor, lead, 'lead.created'),
    };
  }

  getLead(context: TenantContext, id: string) {
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });

    return this.leadsRepository.getById(context, id);
  }

  updateLead(
    context: TenantContext,
    actor: ActorContext | undefined,
    id: string,
    dto: UpdateLeadDto,
  ) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    const lead = this.leadsRepository.update(context, actor, id, dto);
    return {
      lead,
      auditEvent: this.recordAudit(context, actor, lead, 'lead.updated'),
    };
  }

  private recordAudit(
    context: TenantContext,
    actor: ActorContext | undefined,
    lead: LeadRecord,
    action: 'lead.created' | 'lead.updated',
  ) {
    return this.auditService.createAuditEventPlaceholder({
      action,
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId: lead.id,
      resourceType: 'lead',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: { lead },
    });
  }
}
