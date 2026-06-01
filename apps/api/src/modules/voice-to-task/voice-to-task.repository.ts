import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantAwareRepository } from '../../common/repositories/tenant-aware.repository';
import { TenantContext } from '../../common/tenant/tenant-context';

export type VoiceToTaskDraftStatusValue = 'DRAFT' | 'NEEDS_REVIEW' | 'CONFIRMED' | 'REJECTED';

export type VoiceToTaskDraftRecord = {
  id: string;
  tenantId: string;
  voiceNoteId: string;
  transcriptId?: string;
  title: string;
  description?: string;
  suggestedPriority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: VoiceToTaskDraftStatusValue;
  createdByUserId?: string;
  confirmedAt?: string;
  confirmedByUserId?: string;
  taskCreatedAutomatically: false;
  humanConfirmationRequired: true;
  sourceType: 'sprint-8-placeholder';
};

@Injectable()
export class VoiceToTaskRepository extends TenantAwareRepository {
  listDrafts(context: TenantContext): VoiceToTaskDraftRecord[] {
    const tenant = this.requireTenantContext(context);

    return [this.placeholderDraft(tenant.tenantId)];
  }

  createDraft(
    context: TenantContext,
    actor: ActorContext | undefined,
    input: {
      voiceNoteId: string;
      transcriptId?: string;
      title: string;
      description?: string;
      suggestedPriority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    },
  ): VoiceToTaskDraftRecord {
    const tenant = this.requireTenantContext(context);

    return {
      createdByUserId: actor?.actorId,
      description: input.description,
      humanConfirmationRequired: true,
      id: randomUUID(),
      sourceType: 'sprint-8-placeholder',
      status: 'NEEDS_REVIEW',
      suggestedPriority: input.suggestedPriority,
      taskCreatedAutomatically: false,
      tenantId: tenant.tenantId,
      title: input.title,
      transcriptId: input.transcriptId,
      voiceNoteId: input.voiceNoteId,
    };
  }

  getDraftById(context: TenantContext, id: string): VoiceToTaskDraftRecord {
    const tenant = this.requireTenantContext(context);

    return {
      ...this.placeholderDraft(tenant.tenantId),
      id,
    };
  }

  confirmDraft(
    context: TenantContext,
    actor: ActorContext | undefined,
    id: string,
  ): VoiceToTaskDraftRecord {
    const draft = this.getDraftById(context, id);

    return {
      ...draft,
      confirmedAt: new Date().toISOString(),
      confirmedByUserId: actor?.actorId,
      status: 'CONFIRMED',
      taskCreatedAutomatically: false,
    };
  }

  private placeholderDraft(tenantId: string): VoiceToTaskDraftRecord {
    return {
      description: 'Placeholder task description extracted from a reviewed transcript.',
      humanConfirmationRequired: true,
      id: 'sprint-8-voice-task-draft-placeholder',
      sourceType: 'sprint-8-placeholder',
      status: 'NEEDS_REVIEW',
      suggestedPriority: 'MEDIUM',
      taskCreatedAutomatically: false,
      tenantId,
      title: 'Review voice-to-task draft',
      transcriptId: 'sprint-8-transcript-placeholder',
      voiceNoteId: 'sprint-8-voice-note-placeholder',
    };
  }
}
