import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DeadlineRemindersJob } from './jobs/deadline-reminders.job';
import { InviteExpiryJob } from './jobs/invite-expiry.job';
import { AppointmentRemindersJob } from './jobs/appointment-reminders.job';
import { ClientReviewRemindersJob } from './jobs/client-review-reminders.job';
import { OpsWatchdogJob } from './jobs/ops-watchdog.job';
import { StorageCapacityJob } from './jobs/storage-capacity.job';
import { OpsAlertsService } from './ops-alerts.service';
import { OpsController } from './ops.controller';
import { SchedulerService } from './scheduler.service';
import { SCHEDULED_JOBS, ScheduledJob } from './scheduler.types';

@Module({
  imports: [NotificationsModule, PrismaModule, PermissionsModule, StorageModule],
  controllers: [OpsController],
  providers: [
    InviteExpiryJob,
    DeadlineRemindersJob,
    AppointmentRemindersJob,
    ClientReviewRemindersJob,
    OpsAlertsService,
    OpsWatchdogJob,
    StorageCapacityJob,
    {
      provide: SCHEDULED_JOBS,
      useFactory: (...jobs: ScheduledJob[]) => jobs,
      inject: [InviteExpiryJob, DeadlineRemindersJob, AppointmentRemindersJob, ClientReviewRemindersJob, OpsWatchdogJob, StorageCapacityJob],
    },
    SchedulerService,
  ],
  exports: [SchedulerService, OpsAlertsService],
})
export class SchedulerModule {}
