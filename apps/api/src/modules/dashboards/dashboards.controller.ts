import { Controller, Get, Headers, UseGuards } from '@nestjs/common';
import {
  actorContextFromHeaders,
  RequestHeaders,
  tenantContextFromHeaders,
} from '../../common/http/request-context';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { DashboardsService } from './dashboards.service';

@Controller('dashboards')
@UseGuards(PermissionGuard)
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  @Get('workspace-summary')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.DASHBOARD })
  getWorkspaceSummary(@Headers() headers: RequestHeaders) {
    return this.dashboardsService.getWorkspaceSummary(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
    );
  }

  @Get('client-summary')
  @RequirePermission({
    action: PermissionAction.READ,
    resource: PermissionResource.DASHBOARD,
    scope: 'client-portal',
  })
  getClientSummary(@Headers() headers: RequestHeaders) {
    return this.dashboardsService.getClientSummary(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
    );
  }
}
