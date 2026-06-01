import { Injectable } from '@nestjs/common';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantContext } from '../../common/tenant/tenant-context';
import { AiExtractionPlaceholderService } from '../ai-provider/ai-extraction.placeholder';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { VoiceNotesRepository } from '../voice-notes/voice-notes.repository';
import { ConfirmVoiceToTaskDraftDto } from './dto/confirm-voice-to-task-draft.dto';
import { VoiceToTaskDraftRecord, VoiceToTaskRepository } from './voice-to-task.repository';

@Injectable()
export class VoiceToTaskService {
  constructor(
    private readonly voiceToTaskRepository: VoiceToTaskRepository,
    private readonly voiceNotesRepository: VoiceNotesRepository,
    private readonly aiExtractionPlaceholder: AiExtractionPlaceholderService,
    private readonly resourceScopeService: ResourceScopeService,
    private readonly auditService: AuditService,
  ) {}

  createDraftFromVoiceNote(
    context: TenantContext,
    actor: ActorContext | undefined,
    voiceNoteId: string,
  ) {
    const transcript = this.voiceNotesRepository.getTranscript(context, voiceNoteId);

    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    const extraction = this.aiExtractionPlaceholder.extractTaskDraftFromTranscript({
      transcriptId: transcript.id,
      transcriptText: transcript.text,
    });
    const draft = this.voiceToTaskRepository.createDraft(context, actor, {
      description: extraction.description,
      suggestedPriority: extraction.suggestedPriority,
      title: extraction.title,
      transcriptId: transcript.id,
      voiceNoteId,
    });

    return {
      aiAuditEvent: this.recordAiAudit(context, actor, draft),
      draft,
      draftAuditEvent: this.recordDraftAudit(
        context,
        actor,
        draft,
        'voice_to_task_draft.created',
      ),
      extractionPolicy: {
        externalProviderCalled: extraction.externalProviderCalled,
        humanConfirmationRequired: extraction.humanConfirmationRequired,
        taskCreatedAutomatically: extraction.taskCreatedAutomatically,
      },
    };
  }

  listDrafts(context: TenantContext) {
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });

    return this.voiceToTaskRepository.listDrafts(context);
  }

  confirmDraft(
    context: TenantContext,
    actor: ActorContext | undefined,
    id: string,
    _dto: ConfirmVoiceToTaskDraftDto,
  ) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    const draft = this.voiceToTaskRepository.confirmDraft(context, actor, id);
    return {
      confirmationResult: {
        humanConfirmed: true,
        taskCreated: false,
        taskCreationMode: 'placeholder-only-no-automatic-task',
      },
      draft,
      draftAuditEvent: this.recordDraftAudit(
        context,
        actor,
        draft,
        'voice_to_task_draft.confirmed',
      ),
    };
  }

  private recordDraftAudit(
    context: TenantContext,
    actor: ActorContext | undefined,
    draft: VoiceToTaskDraftRecord,
    action: 'voice_to_task_draft.created' | 'voice_to_task_draft.confirmed',
  ) {
    return this.auditService.createAuditEventPlaceholder({
      action,
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId: draft.id,
      resourceType: 'voice-to-task-draft',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: {
        draftId: draft.id,
        humanConfirmationRequired: draft.humanConfirmationRequired,
        taskCreatedAutomatically: draft.taskCreatedAutomatically,
      },
    });
  }

  private recordAiAudit(
    context: TenantContext,
    actor: ActorContext | undefined,
    draft: VoiceToTaskDraftRecord,
  ) {
    return this.auditService.createAuditEventPlaceholder({
      action: 'ai.extraction.placeholder_used',
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId: draft.id,
      resourceType: 'ai-placeholder',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: {
        externalProviderCalled: false,
        prompt: 'redacted-ai-placeholder-prompt',
        taskCreatedAutomatically: false,
      },
    });
  }
}
