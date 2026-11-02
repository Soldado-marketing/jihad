import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { AppointmentsController, ClientAppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

@Module({
  controllers: [AppointmentsController, ClientAppointmentsController],
  imports: [AuditModule, MembershipsModule, NotificationsModule, PermissionsModule],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
