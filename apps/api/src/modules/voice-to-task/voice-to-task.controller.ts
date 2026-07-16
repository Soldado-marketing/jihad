import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { ConfirmVoiceToTaskDraftDto } from './dto/confirm-voice-to-task-draft.dto';
import { VoiceToTaskService } from './voice-to-task.service';

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class VoiceToTaskController {
  constructor(private readonly voiceToTaskService: VoiceToTaskService) {}

  @Post('voice-notes/:id/task-draft')
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.VOICE_TO_TASK_DRAFT })
  createDraftFromVoiceNote(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.voiceToTaskService.createDraftFromVoiceNote(user.tenantId, user.sub, id);
  }

  @Get('voice-to-task-drafts')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.VOICE_TO_TASK_DRAFT })
  listDrafts(@CurrentUser() user: JwtPayload) {
    return this.voiceToTaskService.listDrafts(user.tenantId);
  }

  @Get('voice-to-task-drafts/:id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.VOICE_TO_TASK_DRAFT })
  getDraft(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.voiceToTaskService.getDraft(user.tenantId, id);
  }

  @Post('voice-to-task-drafts/:id/confirm')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.VOICE_TO_TASK_DRAFT })
  confirmDraft(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: ConfirmVoiceToTaskDraftDto) {
    return this.voiceToTaskService.confirmDraft(user.tenantId, user.sub, id, dto);
  }
}