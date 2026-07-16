import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { FollowUpsController } from './follow-ups.controller';
import { FollowUpsRepository } from './follow-ups.repository';
import { FollowUpsService } from './follow-ups.service';

@Module({
  controllers: [FollowUpsController],
  imports: [PermissionsModule],
  providers: [FollowUpsRepository, FollowUpsService],
})
export class FollowUpsModule {}
