import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantAwareRepository } from '../../common/repositories/tenant-aware.repository';
import { TenantContext } from '../../common/tenant/tenant-context';
import { CreateMeetingDto } from './dto/create-meeting.dto';

export type MeetingRecord = {
  id: string;
  tenantId: string;
  leadId?: string;
  opportunityId?: string;
  title: string;
  scheduledAt?: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELED';
  notes?: string;
  actorId?: string;
  sourceType: 'sprint-5-placeholder';
};

@Injectable()
export class MeetingsRepository extends TenantAwareRepository {
  list(context: TenantContext): MeetingRecord[] {
    const tenant = this.requireTenantContext(context);

    return [
      {
        id: 'sprint-5-meeting-placeholder',
        sourceType: 'sprint-5-placeholder',
        status: 'SCHEDULED',
        tenantId: tenant.tenantId,
        title: 'Sprint 5 Meeting Placeholder',
      },
    ];
  }

  create(
    context: TenantContext,
    actor: ActorContext | undefined,
    dto: CreateMeetingDto,
  ): MeetingRecord {
    const tenant = this.requireTenantContext(context);

    return {
      actorId: actor?.actorId,
      id: randomUUID(),
      leadId: dto.leadId,
      notes: dto.notes,
      opportunityId: dto.opportunityId,
      scheduledAt: dto.scheduledAt,
      sourceType: 'sprint-5-placeholder',
      status: 'SCHEDULED',
      tenantId: tenant.tenantId,
      title: dto.title,
    };
  }
}
