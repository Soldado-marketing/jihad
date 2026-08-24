import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RequestIdMiddleware } from './common/http/request-id.middleware';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AiProviderModule } from './modules/ai-provider/ai-provider.module';
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
import { InvitesModule } from './modules/invites/invites.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { LoginHistoryModule } from './modules/login-history/login-history.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { SubtasksModule } from './modules/subtasks/subtasks.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { TenantContextModule } from './modules/tenant-context/tenant-context.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { UsersModule } from './modules/users/users.module';
import { TranscriptionModule } from './modules/transcription/transcription.module';
import { VoiceNotesModule } from './modules/voice-notes/voice-notes.module';
import { VoiceToTaskModule } from './modules/voice-to-task/voice-to-task.module';
import { AdminUsersModule } from './modules/admin-users/admin-users.module';
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
    InvitesModule,
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
    RealtimeModule,
    ChatModule,
    NotificationsModule,
    TranscriptionModule,
    AiProviderModule,
    VoiceNotesModule,
    VoiceToTaskModule,
    FinanceModule,
    InvoicesModule,
    PaymentsModule,
    DashboardsModule,
    ReportsModule,
    AdminUsersModule,
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
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
