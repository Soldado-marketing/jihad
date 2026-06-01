import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { DashboardsController } from './dashboards.controller';
import { DashboardsRepository } from './dashboards.repository';
import { DashboardsService } from './dashboards.service';

@Module({
  controllers: [DashboardsController],
  imports: [AuditModule, PermissionsModule],
  providers: [DashboardsRepository, DashboardsService],
})
export class DashboardsModule {}
