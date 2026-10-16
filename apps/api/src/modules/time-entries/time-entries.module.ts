import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { TimeEntriesController } from './time-entries.controller';
import { TimeEntriesRepository } from './time-entries.repository';
import { TimeEntriesService } from './time-entries.service';

@Module({
  imports: [AuditModule, PermissionsModule],
  controllers: [TimeEntriesController],
  providers: [TimeEntriesService, TimeEntriesRepository],
})
export class TimeEntriesModule {}
