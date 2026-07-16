import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { TasksController } from './tasks.controller';
import { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';

@Module({
  controllers: [TasksController],
  imports: [PermissionsModule],
  providers: [TasksRepository, TasksService],
  exports: [TasksService],
})
export class TasksModule {}
