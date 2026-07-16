import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { MeetingsController } from './meetings.controller';
import { MeetingsRepository } from './meetings.repository';
import { MeetingsService } from './meetings.service';

@Module({
  controllers: [MeetingsController],
  imports: [PermissionsModule],
  providers: [MeetingsRepository, MeetingsService],
})
export class MeetingsModule {}
