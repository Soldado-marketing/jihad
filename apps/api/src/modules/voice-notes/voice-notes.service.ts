import { Injectable } from '@nestjs/common';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantContext } from '../../common/tenant/tenant-context';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { TranscriptionProviderPlaceholder } from '../transcription/transcription-provider.placeholder';
import { CreateVoiceNoteDto } from './dto/create-voice-note.dto';
import { UpdateVoiceNoteDto } from './dto/update-voice-note.dto';
import { VoiceNoteRecord, VoiceNotesRepository, VoiceTranscriptRecord } from './voice-notes.repository';

@Injectable()
export class VoiceNotesService {
  constructor(
    private readonly voiceNotesRepository: VoiceNotesRepository,
    private readonly resourceScopeService: ResourceScopeService,
    private readonly auditService: AuditService,
    private readonly transcriptionProvider: TranscriptionProviderPlaceholder,
  ) {}

  listVoiceNotes(context: TenantContext) {
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });

    return this.voiceNotesRepository.list(context);
  }

  createVoiceNote(
    context: TenantContext,
    actor: ActorContext | undefined,
    dto: CreateVoiceNoteDto,
  ) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    const voiceNote = this.voiceNotesRepository.create(context, actor, dto);
    return {
      auditEvent: this.recordVoiceNoteAudit(context, actor, voiceNote, 'voice_note.created'),
      voiceNote,
    };
  }

  getVoiceNote(context: TenantContext, id: string) {
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });

    return this.voiceNotesRepository.getById(context, id);
  }

  updateVoiceNote(
    context: TenantContext,
    actor: ActorContext | undefined,
    id: string,
    dto: UpdateVoiceNoteDto,
  ) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    const voiceNote = this.voiceNotesRepository.update(context, actor, id, dto);
    return {
      auditEvent: this.recordVoiceNoteAudit(context, actor, voiceNote, 'voice_note.updated'),
      voiceNote,
    };
  }

  requestTranscription(context: TenantContext, actor: ActorContext | undefined, id: string) {
    const voiceNote = this.voiceNotesRepository.markTranscriptionRequested(context, id);

    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: voiceNote.tenantId });
    }

    const placeholder = this.transcriptionProvider.transcribePlaceholder({
      languageHint: voiceNote.languageHint,
      voiceNoteId: voiceNote.id,
    });
    const transcript = this.voiceNotesRepository.createTranscript(context, voiceNote.id, {
      confidence: placeholder.confidence,
      language: placeholder.language,
      providerRef: 'placeholder-no-external-provider',
      status: placeholder.status,
      text: placeholder.text,
    });

    return {
      providerPolicy: placeholder.providerPolicy,
      requestedAuditEvent: this.recordVoiceNoteAudit(
        context,
        actor,
        voiceNote,
        'voice_note.transcription_requested',
      ),
      transcript,
      transcriptAuditEvent: this.recordTranscriptAudit(context, actor, transcript),
      voiceNote,
    };
  }

  getTranscript(context: TenantContext, id: string) {
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });

    return this.voiceNotesRepository.getTranscript(context, id);
  }

  private recordVoiceNoteAudit(
    context: TenantContext,
    actor: ActorContext | undefined,
    voiceNote: VoiceNoteRecord,
    action: 'voice_note.created' | 'voice_note.updated' | 'voice_note.transcription_requested',
  ) {
    return this.auditService.createAuditEventPlaceholder({
      action,
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId: voiceNote.id,
      resourceType: 'voice-note',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: {
        clientVisible: voiceNote.clientVisible,
        durationSeconds: voiceNote.durationSeconds,
        status: voiceNote.status,
        storageKey: 'redacted-storage-reference-placeholder',
        voiceNoteId: voiceNote.id,
      },
    });
  }

  private recordTranscriptAudit(
    context: TenantContext,
    actor: ActorContext | undefined,
    transcript: VoiceTranscriptRecord,
  ) {
    return this.auditService.createAuditEventPlaceholder({
      action: 'voice_transcript.created',
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId: transcript.id,
      resourceType: 'voice-transcript',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: {
        confidence: transcript.confidence,
        transcriptText: 'redacted-transcript-placeholder',
        voiceNoteId: transcript.voiceNoteId,
      },
    });
  }
}
