import { Module } from '@nestjs/common';
import { AiProviderModule } from '../ai-provider/ai-provider.module';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { VoiceNotesModule } from '../voice-notes/voice-notes.module';
import { VoiceToTaskController } from './voice-to-task.controller';
import { VoiceToTaskRepository } from './voice-to-task.repository';
import { VoiceToTaskService } from './voice-to-task.service';

@Module({
  controllers: [VoiceToTaskController],
  imports: [AiProviderModule, AuditModule, PermissionsModule, VoiceNotesModule],
  providers: [VoiceToTaskRepository, VoiceToTaskService],
})
export class VoiceToTaskModule {}
