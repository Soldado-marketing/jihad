import { Module } from '@nestjs/common';
import { MembershipsModule } from '../memberships/memberships.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { DashboardsController } from './dashboards.controller';
import { DashboardsRepository } from './dashboards.repository';
import { DashboardsService } from './dashboards.service';

@Module({
  imports: [PermissionsModule, MembershipsModule],
  controllers: [DashboardsController],
  providers: [DashboardsRepository, DashboardsService],
})
export class DashboardsModule {}