import { Module } from '@nestjs/common';
import { VoiceNotesController } from './voice-notes.controller';
import { VoiceNotesRepository } from './voice-notes.repository';
import { VoiceNotesService } from './voice-notes.service';

@Module({
  controllers: [VoiceNotesController],
  providers: [VoiceNotesRepository, VoiceNotesService],
})
export class VoiceNotesModule {}
