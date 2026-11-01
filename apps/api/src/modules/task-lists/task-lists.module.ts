import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { TaskListsController } from './task-lists.controller';
import { TaskListsRepository } from './task-lists.repository';
import { TaskListsService } from './task-lists.service';

@Module({
  controllers: [TaskListsController],
  imports: [AuditModule, PermissionsModule],
  providers: [TaskListsRepository, TaskListsService],
})
export class TaskListsModule {}
