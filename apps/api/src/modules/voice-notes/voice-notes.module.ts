import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { TranscriptionModule } from '../transcription/transcription.module';
import { VoiceNotesController } from './voice-notes.controller';
import { VoiceNotesRepository } from './voice-notes.repository';
import { VoiceNotesService } from './voice-notes.service';

@Module({
  controllers: [VoiceNotesController],
  imports: [AuditModule, PermissionsModule, TranscriptionModule],
  providers: [VoiceNotesRepository, VoiceNotesService],
  exports: [VoiceNotesRepository, VoiceNotesService],
})
export class VoiceNotesModule {}
