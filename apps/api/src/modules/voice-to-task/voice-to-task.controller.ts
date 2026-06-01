import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import {
  actorContextFromHeaders,
  RequestHeaders,
  tenantContextFromHeaders,
} from '../../common/http/request-context';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { ConfirmVoiceToTaskDraftDto } from './dto/confirm-voice-to-task-draft.dto';
import { VoiceToTaskService } from './voice-to-task.service';

@Controller()
@UseGuards(PermissionGuard)
export class VoiceToTaskController {
  constructor(private readonly voiceToTaskService: VoiceToTaskService) {}

  @Post('voice-notes/:id/task-draft')
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.VOICE_TO_TASK_DRAFT })
  createDraftFromVoiceNote(@Headers() headers: RequestHeaders, @Param('id') id: string) {
    return this.voiceToTaskService.createDraftFromVoiceNote(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      id,
    );
  }

  @Get('voice-to-task-drafts')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.VOICE_TO_TASK_DRAFT })
  listDrafts(@Headers() headers: RequestHeaders) {
    return this.voiceToTaskService.listDrafts(tenantContextFromHeaders(headers));
  }

  @Post('voice-to-task-drafts/:id/confirm')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.VOICE_TO_TASK_DRAFT })
  confirmDraft(
    @Headers() headers: RequestHeaders,
    @Param('id') id: string,
    @Body() dto: ConfirmVoiceToTaskDraftDto,
  ) {
    return this.voiceToTaskService.confirmDraft(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      id,
      dto,
    );
  }
}
