import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantAwareRepository } from '../../common/repositories/tenant-aware.repository';
import { TenantContext } from '../../common/tenant/tenant-context';
import { CreateInternalNoteDto } from './dto/create-internal-note.dto';

export type InternalNoteRecord = {
  id: string;
  tenantId: string;
  body: string;
  threadKey?: string;
  resourceType?: string;
  resourceId?: string;
  createdByUserId?: string;
  visibility: 'internal-only';
  sourceType: 'sprint-5-placeholder';
};

@Injectable()
export class CollaborationRepository extends TenantAwareRepository {
  listInternalNotes(context: TenantContext): InternalNoteRecord[] {
    const tenant = this.requireTenantContext(context);

    return [
      {
        body: 'Sprint 5 internal note placeholder.',
        id: 'sprint-5-internal-note-placeholder',
        sourceType: 'sprint-5-placeholder',
        tenantId: tenant.tenantId,
        threadKey: 'sprint-5-internal-thread',
        visibility: 'internal-only',
      },
    ];
  }

  createInternalNote(
    context: TenantContext,
    actor: ActorContext | undefined,
    dto: CreateInternalNoteDto,
  ): InternalNoteRecord {
    const tenant = this.requireTenantContext(context);

    return {
      body: dto.body,
      createdByUserId: actor?.actorId,
      id: randomUUID(),
      resourceId: dto.resourceId,
      resourceType: dto.resourceType,
      sourceType: 'sprint-5-placeholder',
      tenantId: tenant.tenantId,
      threadKey: dto.threadKey,
      visibility: 'internal-only',
    };
  }
}
