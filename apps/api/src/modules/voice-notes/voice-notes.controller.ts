import { Body, Controller, Get, Headers, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  actorContextFromHeaders,
  RequestHeaders,
  tenantContextFromHeaders,
} from '../../common/http/request-context';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { CreateVoiceNoteDto } from './dto/create-voice-note.dto';
import { UpdateVoiceNoteDto } from './dto/update-voice-note.dto';
import { VoiceNotesService } from './voice-notes.service';

@Controller('voice-notes')
@UseGuards(PermissionGuard)
export class VoiceNotesController {
  constructor(private readonly voiceNotesService: VoiceNotesService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.VOICE_NOTE })
  listVoiceNotes(@Headers() headers: RequestHeaders) {
    return this.voiceNotesService.listVoiceNotes(tenantContextFromHeaders(headers));
  }

  @Post()
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.VOICE_NOTE })
  createVoiceNote(@Headers() headers: RequestHeaders, @Body() dto: CreateVoiceNoteDto) {
    return this.voiceNotesService.createVoiceNote(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      dto,
    );
  }

  @Get(':id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.VOICE_NOTE })
  getVoiceNote(@Headers() headers: RequestHeaders, @Param('id') id: string) {
    return this.voiceNotesService.getVoiceNote(tenantContextFromHeaders(headers), id);
  }

  @Patch(':id')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.VOICE_NOTE })
  updateVoiceNote(
    @Headers() headers: RequestHeaders,
    @Param('id') id: string,
    @Body() dto: UpdateVoiceNoteDto,
  ) {
    return this.voiceNotesService.updateVoiceNote(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      id,
      dto,
    );
  }

  @Post(':id/transcribe')
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.VOICE_TRANSCRIPT })
  requestTranscription(@Headers() headers: RequestHeaders, @Param('id') id: string) {
    return this.voiceNotesService.requestTranscription(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      id,
    );
  }

  @Get(':id/transcript')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.VOICE_TRANSCRIPT })
  getTranscript(@Headers() headers: RequestHeaders, @Param('id') id: string) {
    return this.voiceNotesService.getTranscript(tenantContextFromHeaders(headers), id);
  }
}
