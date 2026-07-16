import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { VoiceToTaskController } from './voice-to-task.controller';
import { VoiceToTaskRepository } from './voice-to-task.repository';
import { VoiceToTaskService } from './voice-to-task.service';

@Module({
  imports: [PermissionsModule],
  controllers: [VoiceToTaskController],
  providers: [VoiceToTaskRepository, VoiceToTaskService],
})
export class VoiceToTaskModule {}