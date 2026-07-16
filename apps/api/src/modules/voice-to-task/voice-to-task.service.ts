import { Injectable } from '@nestjs/common';
import { VoiceToTaskRepository } from './voice-to-task.repository';
import { ConfirmVoiceToTaskDraftDto } from './dto/confirm-voice-to-task-draft.dto';

@Injectable()
export class VoiceToTaskService {
  constructor(private readonly repo: VoiceToTaskRepository) {}

  createDraftFromVoiceNote(tenantId: string, actorId: string, voiceNoteId: string) {
    return this.repo.createDraft(tenantId, actorId, voiceNoteId);
  }

  getDraft(tenantId: string, id: string) {
    return this.repo.getDraft(tenantId, id);
  }

  listDrafts(tenantId: string) {
    return this.repo.listDrafts(tenantId);
  }

  confirmDraft(tenantId: string, actorId: string, id: string, _dto: ConfirmVoiceToTaskDraftDto) {
    return this.repo.confirmDraft(tenantId, actorId, id);
  }
}