import { Module } from '@nestjs/common';
import { MembershipsModule } from '../memberships/memberships.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { ControlCenterRepository } from './control-center.repository';
import { ControlCenterService } from './control-center.service';
import { DashboardsController } from './dashboards.controller';
import { DashboardsRepository } from './dashboards.repository';
import { DashboardsService } from './dashboards.service';

@Module({
  imports: [PermissionsModule, MembershipsModule],
  controllers: [DashboardsController],
  providers: [DashboardsRepository, DashboardsService, ControlCenterRepository, ControlCenterService],
})
export class DashboardsModule {}