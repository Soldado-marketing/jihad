import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { VoiceNotesController } from './voice-notes.controller';
import { VoiceNotesRepository } from './voice-notes.repository';
import { VoiceNotesService } from './voice-notes.service';

@Module({
  controllers: [VoiceNotesController],
  imports: [PermissionsModule],
  providers: [VoiceNotesRepository, VoiceNotesService],
})
export class VoiceNotesModule {}
