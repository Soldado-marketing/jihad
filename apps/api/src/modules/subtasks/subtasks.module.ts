import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { SubtasksController } from './subtasks.controller';
import { SubtasksRepository } from './subtasks.repository';
import { SubtasksService } from './subtasks.service';

@Module({
  controllers: [SubtasksController],
  imports: [AuditModule, PermissionsModule],
  providers: [SubtasksRepository, SubtasksService],
})
export class SubtasksModule {}
