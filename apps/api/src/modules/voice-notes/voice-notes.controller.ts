import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { VoiceNotesService } from './voice-notes.service';

@Controller('voice-notes')
@UseGuards(JwtAuthGuard)
export class VoiceNotesController {
  constructor(private readonly svc: VoiceNotesService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) { return this.svc.list(user.tenantId); }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: { title: string; projectId?: string; taskId?: string }) {
    return this.svc.create(user.tenantId, user.sub, dto.title, dto.projectId, dto.taskId);
  }

  @Get(':id')
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) { return this.svc.get(user.tenantId, id); }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) { return this.svc.delete(user.tenantId, id); }
}
