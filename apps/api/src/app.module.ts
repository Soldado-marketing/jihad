import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RequestIdMiddleware } from './common/http/request-id.middleware';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CalendarModule } from './modules/calendar/calendar.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClientPortalModule } from './modules/client-portal/client-portal.module';
import { ChatModule } from './modules/chat/chat.module';
import { CollaborationModule } from './modules/collaboration/collaboration.module';
import { CrmModule } from './modules/crm/crm.module';
import { DevicesModule } from './modules/devices/devices.module';
import { DashboardsModule } from './modules/dashboards/dashboards.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { FileVersionsModule } from './modules/file-versions/file-versions.module';
import { FilesModule } from './modules/files/files.module';
import { FinanceModule } from './modules/finance/finance.module';
import { HealthController } from './modules/health/health.controller';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { LoginHistoryModule } from './modules/login-history/login-history.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { MyWorkModule } from './modules/my-work/my-work.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { SubtasksModule } from './modules/subtasks/subtasks.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { TenantContextModule } from './modules/tenant-context/tenant-context.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { UsersModule } from './modules/users/users.module';
import { VoiceNotesModule } from './modules/voice-notes/voice-notes.module';
import { VoiceToTaskModule } from './modules/voice-to-task/voice-to-task.module';
import { AdminUsersModule } from './modules/admin-users/admin-users.module';
import { CustomersModule } from './modules/customers/customers.module';
import { InvitesModule } from './modules/invites/invites.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { SearchModule } from './modules/search/search.module';
import { ImportExportModule } from './modules/import-export/import-export.module';
import { TimeEntriesModule } from './modules/time-entries/time-entries.module';
import { RatesModule } from './modules/rates/rates.module';
import { LabelsModule } from './modules/labels/labels.module';
import { MailModule } from './modules/mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // S-03: Global rate limiting. Permissive dev-safe default (600 req / 60s per IP).
    // Stricter per-route limits are applied on auth endpoints via @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 600 }]),
    MailModule,
    PrismaModule,
    TenantContextModule,
    TenantsModule,
    UsersModule,
    MembershipsModule,
    PermissionsModule,
    AuditModule,
    AuthModule,
    SessionsModule,
    DevicesModule,
    LoginHistoryModule,
    ProjectsModule,
    TasksModule,
    SubtasksModule,
    ClientPortalModule,
    CrmModule,
    CollaborationModule,
    FilesModule,
    FileVersionsModule,
    ApprovalsModule,
    ChatModule,
    CalendarModule,
    MyWorkModule,
    NotificationsModule,
    VoiceNotesModule,
    VoiceToTaskModule,
    FinanceModule,
    InvoicesModule,
    PaymentsModule,
    DashboardsModule,
    ReportsModule,
    AdminUsersModule,
    CustomersModule,
    InvitesModule,
    SchedulerModule,
    SearchModule,
    ImportExportModule,
    TimeEntriesModule,
    RatesModule,
    LabelsModule,
  ],
  controllers: [HealthController],
  providers: [
    // S-03: Apply the throttler globally as an APP_GUARD.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  // Phase 2: attach a correlation id to every request/response.
  configure(consumer: MiddlewareConsumer): void {
    // '*path' is the path-to-regexp v8 form Nest 11 expects. The old '*'
    // still works only via LegacyRouteConverter, which logs a warning on
    // every boot and is slated for removal. Coverage is identical: every
    // route still gets a correlation id.
    consumer.apply(RequestIdMiddleware).forRoutes('*path');
  }
}
