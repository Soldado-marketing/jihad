import { Module } from '@nestjs/common';
import { InviteExpiryJob } from './jobs/invite-expiry.job';
import { SchedulerService } from './scheduler.service';
import { SCHEDULED_JOBS, ScheduledJob } from './scheduler.types';

@Module({
  providers: [
    InviteExpiryJob,
    {
      provide: SCHEDULED_JOBS,
      useFactory: (...jobs: ScheduledJob[]) => jobs,
      inject: [InviteExpiryJob],
    },
    SchedulerService,
  ],
  exports: [SchedulerService],
})
export class SchedulerModule {}
