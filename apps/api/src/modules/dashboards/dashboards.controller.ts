import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { DashboardsService } from './dashboards.service';

@Controller('dashboards')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  @Get('workspace-summary')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.DASHBOARD })
  getWorkspaceSummary(@CurrentUser() user: JwtPayload) {
    return this.dashboardsService.getWorkspaceSummary(user.tenantId, user.sub);
  }

  @Get('client-summary')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.DASHBOARD, scope: 'client-portal' })
  getClientSummary(@CurrentUser() user: JwtPayload) {
    return this.dashboardsService.getClientSummary(user.tenantId, user.sub);
  }
}