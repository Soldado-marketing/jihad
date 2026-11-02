import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { ClientComplaintsController, ComplaintsController } from './complaints.controller';
import { ComplaintsService } from './complaints.service';

@Module({
  controllers: [ComplaintsController, ClientComplaintsController],
  imports: [AuditModule, MembershipsModule, NotificationsModule, PermissionsModule],
  providers: [ComplaintsService],
})
export class ComplaintsModule {}
