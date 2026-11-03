import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { ControlCenterService } from './control-center.service';
import { DashboardsService } from './dashboards.service';

@Controller('dashboards')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DashboardsController {
  constructor(
    private readonly dashboardsService: DashboardsService,
    private readonly controlCenter: ControlCenterService,
  ) {}

  @Get('workspace-summary')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.DASHBOARD })
  getWorkspaceSummary(@CurrentUser() user: JwtPayload) {
    return this.dashboardsService.getWorkspaceSummary(user.tenantId, user.sub);
  }

  @Get('client-summary')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.DASHBOARD, scope: 'client-portal' })
  getClientSummary(@CurrentUser() user: JwtPayload) {
    return this.dashboardsService.getClientSummary(user.tenantId, user.sub, user.role);
  }

  /**
   * Owner Control Center: every company where the caller is an ACTIVE OWNER,
   * whatever their role in the active company (the service refuses callers
   * who own none). CLIENT is refused by the guard.
   */
  @Get('control-center')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.DASHBOARD })
  getControlCenter(@CurrentUser() user: JwtPayload) {
    return this.controlCenter.getOverview(user);
  }
}
