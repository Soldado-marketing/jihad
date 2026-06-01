import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantAwareRepository } from '../../common/repositories/tenant-aware.repository';
import { TenantContext } from '../../common/tenant/tenant-context';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';

export type FollowUpRecord = {
  id: string;
  tenantId: string;
  leadId?: string;
  opportunityId?: string;
  title: string;
  dueAt?: string;
  status: 'OPEN' | 'COMPLETED' | 'OVERDUE';
  ownerUserId?: string;
  sourceType: 'sprint-5-placeholder';
};

@Injectable()
export class FollowUpsRepository extends TenantAwareRepository {
  list(context: TenantContext): FollowUpRecord[] {
    const tenant = this.requireTenantContext(context);

    return [
      {
        id: 'sprint-5-follow-up-placeholder',
        sourceType: 'sprint-5-placeholder',
        status: 'OPEN',
        tenantId: tenant.tenantId,
        title: 'Sprint 5 Follow-up Placeholder',
      },
    ];
  }

  create(
    context: TenantContext,
    actor: ActorContext | undefined,
    dto: CreateFollowUpDto,
  ): FollowUpRecord {
    const tenant = this.requireTenantContext(context);

    return {
      dueAt: dto.dueAt,
      id: randomUUID(),
      leadId: dto.leadId,
      opportunityId: dto.opportunityId,
      ownerUserId: actor?.actorId,
      sourceType: 'sprint-5-placeholder',
      status: 'OPEN',
      tenantId: tenant.tenantId,
      title: dto.title,
    };
  }
}
