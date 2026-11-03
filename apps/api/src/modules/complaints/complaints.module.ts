import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { ClientComplaintsController, ClientWorkRequestsController, ComplaintsController, WorkRequestsController } from './complaints.controller';
import { ComplaintsService, WorkRequestsService } from './complaints.service';

@Module({
  controllers: [ComplaintsController, ClientComplaintsController, WorkRequestsController, ClientWorkRequestsController],
  imports: [AuditModule, MembershipsModule, NotificationsModule, PermissionsModule],
  providers: [ComplaintsService, WorkRequestsService],
})
export class ComplaintsModule {}
