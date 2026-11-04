import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { TasksController } from './tasks.controller';
import { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  controllers: [TasksController],
  imports: [AuditModule, NotificationsModule, PermissionsModule],
  providers: [TasksRepository, TasksService],
  exports: [TasksService],
})
export class TasksModule {}
