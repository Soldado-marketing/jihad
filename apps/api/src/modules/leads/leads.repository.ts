import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantAwareRepository } from '../../common/repositories/tenant-aware.repository';
import { TenantContext } from '../../common/tenant/tenant-context';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

export type CrmPipelineStatus =
  | 'LEAD'
  | 'CONTACTED'
  | 'MEETING'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST';

export type LeadRecord = {
  id: string;
  tenantId: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  source?: string;
  status: CrmPipelineStatus;
  ownerUserId?: string;
  sourceType: 'sprint-5-placeholder';
};

@Injectable()
export class LeadsRepository extends TenantAwareRepository {
  list(context: TenantContext): LeadRecord[] {
    const tenant = this.requireTenantContext(context);

    return [
      {
        company: 'Acme Growth',
        email: 'lead@example.com',
        id: 'sprint-5-lead-placeholder',
        name: 'Sprint 5 Lead Placeholder',
        source: 'Referral',
        sourceType: 'sprint-5-placeholder',
        status: 'LEAD',
        tenantId: tenant.tenantId,
      },
    ];
  }

  create(context: TenantContext, actor: ActorContext | undefined, dto: CreateLeadDto): LeadRecord {
    const tenant = this.requireTenantContext(context);

    return {
      company: dto.company,
      email: dto.email,
      id: randomUUID(),
      name: dto.name,
      ownerUserId: actor?.actorId,
      phone: dto.phone,
      source: dto.source,
      sourceType: 'sprint-5-placeholder',
      status: 'LEAD',
      tenantId: tenant.tenantId,
    };
  }

  getById(context: TenantContext, id: string): LeadRecord {
    const tenant = this.requireTenantContext(context);

    return {
      company: 'Acme Growth',
      email: 'lead@example.com',
      id,
      name: 'Sprint 5 Lead Placeholder',
      source: 'Referral',
      sourceType: 'sprint-5-placeholder',
      status: 'LEAD',
      tenantId: tenant.tenantId,
    };
  }

  update(
    context: TenantContext,
    actor: ActorContext | undefined,
    id: string,
    dto: UpdateLeadDto,
  ): LeadRecord {
    const tenant = this.requireTenantContext(context);

    return {
      company: dto.company,
      email: dto.email,
      id,
      name: dto.name ?? 'Sprint 5 Lead Placeholder',
      ownerUserId: actor?.actorId,
      phone: dto.phone,
      source: dto.source,
      sourceType: 'sprint-5-placeholder',
      status: dto.status ?? 'LEAD',
      tenantId: tenant.tenantId,
    };
  }
}
