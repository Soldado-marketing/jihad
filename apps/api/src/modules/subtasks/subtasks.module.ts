import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { SubtasksController } from './subtasks.controller';
import { SubtasksRepository } from './subtasks.repository';
import { SubtasksService } from './subtasks.service';

@Module({
  imports: [PermissionsModule],
  controllers: [SubtasksController],
  providers: [SubtasksRepository, SubtasksService],
})
export class SubtasksModule {}
