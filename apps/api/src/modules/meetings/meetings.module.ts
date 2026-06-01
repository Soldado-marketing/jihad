import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { MeetingsController } from './meetings.controller';
import { MeetingsRepository } from './meetings.repository';
import { MeetingsService } from './meetings.service';

@Module({
  controllers: [MeetingsController],
  imports: [AuditModule, PermissionsModule],
  providers: [MeetingsRepository, MeetingsService],
})
export class MeetingsModule {}
