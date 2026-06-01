import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { FollowUpsController } from './follow-ups.controller';
import { FollowUpsRepository } from './follow-ups.repository';
import { FollowUpsService } from './follow-ups.service';

@Module({
  controllers: [FollowUpsController],
  imports: [AuditModule, PermissionsModule],
  providers: [FollowUpsRepository, FollowUpsService],
})
export class FollowUpsModule {}
