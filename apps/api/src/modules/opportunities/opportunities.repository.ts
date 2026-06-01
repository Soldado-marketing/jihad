import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantAwareRepository } from '../../common/repositories/tenant-aware.repository';
import { TenantContext } from '../../common/tenant/tenant-context';
import { CrmPipelineStatus } from '../leads/leads.repository';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';

export type OpportunityRecord = {
  id: string;
  tenantId: string;
  leadId?: string;
  title: string;
  valueCents?: number;
  currency?: string;
  status: CrmPipelineStatus;
  ownerUserId?: string;
  expectedCloseAt?: string;
  sourceType: 'sprint-5-placeholder';
};

@Injectable()
export class OpportunitiesRepository extends TenantAwareRepository {
  list(context: TenantContext): OpportunityRecord[] {
    const tenant = this.requireTenantContext(context);

    return [
      {
        currency: 'USD',
        id: 'sprint-5-opportunity-placeholder',
        sourceType: 'sprint-5-placeholder',
        status: 'CONTACTED',
        tenantId: tenant.tenantId,
        title: 'Sprint 5 Opportunity Placeholder',
        valueCents: 250000,
      },
    ];
  }

  create(
    context: TenantContext,
    actor: ActorContext | undefined,
    dto: CreateOpportunityDto,
  ): OpportunityRecord {
    const tenant = this.requireTenantContext(context);

    return {
      currency: dto.currency,
      expectedCloseAt: dto.expectedCloseAt,
      id: randomUUID(),
      leadId: dto.leadId,
      ownerUserId: actor?.actorId,
      sourceType: 'sprint-5-placeholder',
      status: 'CONTACTED',
      tenantId: tenant.tenantId,
      title: dto.title,
      valueCents: dto.valueCents,
    };
  }

  getById(context: TenantContext, id: string): OpportunityRecord {
    const tenant = this.requireTenantContext(context);

    return {
      currency: 'USD',
      id,
      sourceType: 'sprint-5-placeholder',
      status: 'CONTACTED',
      tenantId: tenant.tenantId,
      title: 'Sprint 5 Opportunity Placeholder',
      valueCents: 250000,
    };
  }

  update(
    context: TenantContext,
    actor: ActorContext | undefined,
    id: string,
    dto: UpdateOpportunityDto,
  ): OpportunityRecord {
    const tenant = this.requireTenantContext(context);

    return {
      currency: dto.currency,
      expectedCloseAt: dto.expectedCloseAt,
      id,
      leadId: dto.leadId,
      ownerUserId: actor?.actorId,
      sourceType: 'sprint-5-placeholder',
      status: dto.status ?? 'CONTACTED',
      tenantId: tenant.tenantId,
      title: dto.title ?? 'Sprint 5 Opportunity Placeholder',
      valueCents: dto.valueCents,
    };
  }
}
