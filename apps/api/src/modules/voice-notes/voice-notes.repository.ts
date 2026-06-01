import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantAwareRepository } from '../../common/repositories/tenant-aware.repository';
import { TenantContext } from '../../common/tenant/tenant-context';
import { CreateVoiceNoteDto } from './dto/create-voice-note.dto';
import { UpdateVoiceNoteDto } from './dto/update-voice-note.dto';

export type VoiceNoteStatusValue =
  | 'DRAFT'
  | 'RECORDED'
  | 'TRANSCRIPTION_REQUESTED'
  | 'TRANSCRIBED'
  | 'FAILED'
  | 'ARCHIVED';

export type TranscriptStatusValue = 'PENDING' | 'COMPLETED' | 'LOW_CONFIDENCE' | 'FAILED';

export type VoiceNoteRecord = {
  id: string;
  tenantId: string;
  projectId?: string;
  taskId?: string;
  title: string;
  status: VoiceNoteStatusValue;
  languageHint?: 'ar' | 'en' | 'de' | 'mixed';
  storageKey?: string;
  durationSeconds?: number;
  createdByUserId?: string;
  clientVisible: boolean;
  clientScopeKey?: string;
  sourceType: 'sprint-8-placeholder';
};

export type VoiceTranscriptRecord = {
  id: string;
  tenantId: string;
  voiceNoteId: string;
  status: TranscriptStatusValue;
  language?: 'ar' | 'en' | 'de' | 'mixed';
  text?: string;
  confidence?: number;
  providerRef?: string;
  sourceType: 'sprint-8-placeholder';
};

@Injectable()
export class VoiceNotesRepository extends TenantAwareRepository {
  list(context: TenantContext): VoiceNoteRecord[] {
    const tenant = this.requireTenantContext(context);

    return [this.placeholderVoiceNote(tenant.tenantId)];
  }

  create(
    context: TenantContext,
    actor: ActorContext | undefined,
    dto: CreateVoiceNoteDto,
  ): VoiceNoteRecord {
    const tenant = this.requireTenantContext(context);

    return {
      clientScopeKey: dto.clientScopeKey,
      clientVisible: Boolean(dto.clientScopeKey),
      createdByUserId: actor?.actorId,
      durationSeconds: dto.durationSeconds,
      id: randomUUID(),
      languageHint: dto.languageHint,
      projectId: dto.projectId,
      sourceType: 'sprint-8-placeholder',
      status: 'RECORDED',
      storageKey: dto.storageKey,
      taskId: dto.taskId,
      tenantId: tenant.tenantId,
      title: dto.title,
    };
  }

  getById(context: TenantContext, id: string): VoiceNoteRecord {
    const tenant = this.requireTenantContext(context);

    return {
      ...this.placeholderVoiceNote(tenant.tenantId),
      id,
    };
  }

  update(
    context: TenantContext,
    actor: ActorContext | undefined,
    id: string,
    dto: UpdateVoiceNoteDto,
  ): VoiceNoteRecord {
    const tenant = this.requireTenantContext(context);

    return {
      clientScopeKey: dto.clientScopeKey,
      clientVisible: Boolean(dto.clientScopeKey),
      createdByUserId: actor?.actorId,
      durationSeconds: dto.durationSeconds,
      id,
      languageHint: dto.languageHint,
      sourceType: 'sprint-8-placeholder',
      status: dto.status ?? 'RECORDED',
      tenantId: tenant.tenantId,
      title: dto.title ?? 'Sprint 8 Voice Note Placeholder',
    };
  }

  markTranscriptionRequested(context: TenantContext, id: string): VoiceNoteRecord {
    const voiceNote = this.getById(context, id);

    return {
      ...voiceNote,
      status: 'TRANSCRIPTION_REQUESTED',
    };
  }

  createTranscript(
    context: TenantContext,
    voiceNoteId: string,
    input: {
      status: TranscriptStatusValue;
      language?: 'ar' | 'en' | 'de' | 'mixed';
      text?: string;
      confidence?: number;
      providerRef?: string;
    },
  ): VoiceTranscriptRecord {
    const tenant = this.requireTenantContext(context);

    return {
      confidence: input.confidence,
      id: randomUUID(),
      language: input.language,
      providerRef: input.providerRef,
      sourceType: 'sprint-8-placeholder',
      status: input.status,
      tenantId: tenant.tenantId,
      text: input.text,
      voiceNoteId,
    };
  }

  getTranscript(context: TenantContext, voiceNoteId: string): VoiceTranscriptRecord {
    const tenant = this.requireTenantContext(context);

    return {
      confidence: 0.82,
      id: 'sprint-8-transcript-placeholder',
      language: 'mixed',
      providerRef: 'placeholder-no-external-provider',
      sourceType: 'sprint-8-placeholder',
      status: 'LOW_CONFIDENCE',
      tenantId: tenant.tenantId,
      text: `Placeholder transcript for voice note ${voiceNoteId}.`,
      voiceNoteId,
    };
  }

  private placeholderVoiceNote(tenantId: string): VoiceNoteRecord {
    return {
      clientVisible: false,
      durationSeconds: 45,
      id: 'sprint-8-voice-note-placeholder',
      languageHint: 'mixed',
      sourceType: 'sprint-8-placeholder',
      status: 'RECORDED',
      storageKey: 'voice-notes/storage-placeholder',
      tenantId,
      title: 'Sprint 8 Voice Note Placeholder',
    };
  }
}
