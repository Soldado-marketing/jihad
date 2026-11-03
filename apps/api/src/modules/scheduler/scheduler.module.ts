import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { DeadlineRemindersJob } from './jobs/deadline-reminders.job';
import { InviteExpiryJob } from './jobs/invite-expiry.job';
import { AppointmentRemindersJob } from './jobs/appointment-reminders.job';
import { ClientReviewRemindersJob } from './jobs/client-review-reminders.job';
import { SchedulerService } from './scheduler.service';
import { SCHEDULED_JOBS, ScheduledJob } from './scheduler.types';

@Module({
  imports: [NotificationsModule],
  providers: [
    InviteExpiryJob,
    DeadlineRemindersJob,
    AppointmentRemindersJob,
    ClientReviewRemindersJob,
    {
      provide: SCHEDULED_JOBS,
      useFactory: (...jobs: ScheduledJob[]) => jobs,
      inject: [InviteExpiryJob, DeadlineRemindersJob, AppointmentRemindersJob, ClientReviewRemindersJob],
    },
    SchedulerService,
  ],
  exports: [SchedulerService],
})
export class SchedulerModule {}
