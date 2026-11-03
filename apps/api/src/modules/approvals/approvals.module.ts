import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsRepository } from './approvals.repository';
import { ApprovalsService } from './approvals.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { FileVersionsModule } from '../file-versions/file-versions.module';
import { ClientDeliveriesController, DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';

@Module({
  controllers: [ApprovalsController, DeliveriesController, ClientDeliveriesController],
  imports: [NotificationsModule, PermissionsModule, AuditModule, MembershipsModule, FileVersionsModule],
  providers: [ApprovalsRepository, ApprovalsService, DeliveriesService],
})
export class ApprovalsModule {}
