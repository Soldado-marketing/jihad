import { Controller, Get, Headers, Param, UseGuards } from '@nestjs/common';
import {
  actorContextFromHeaders,
  RequestHeaders,
  tenantContextFromHeaders,
} from '../../common/http/request-context';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { ClientPortalService } from './client-portal.service';

@Controller('client')
@UseGuards(PermissionGuard)
export class ClientPortalController {
  constructor(private readonly clientPortalService: ClientPortalService) {}

  @Get('projects')
  @RequirePermission({
    action: PermissionAction.READ,
    resource: PermissionResource.PROJECT,
    scope: 'client-portal',
  })
  listProjects(@Headers() headers: RequestHeaders) {
    return this.clientPortalService.listProjects(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
    );
  }

  @Get('projects/:id')
  @RequirePermission({
    action: PermissionAction.READ,
    resource: PermissionResource.PROJECT,
    scope: 'client-portal',
  })
  getProject(@Headers() headers: RequestHeaders, @Param('id') id: string) {
    return this.clientPortalService.getProject(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      id,
    );
  }

  @Get('tasks')
  @RequirePermission({
    action: PermissionAction.READ,
    resource: PermissionResource.TASK,
    scope: 'client-portal',
  })
  listTasks(@Headers() headers: RequestHeaders) {
    return this.clientPortalService.listTasks(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
    );
  }

  @Get('tasks/:id')
  @RequirePermission({
    action: PermissionAction.READ,
    resource: PermissionResource.TASK,
    scope: 'client-portal',
  })
  getTask(@Headers() headers: RequestHeaders, @Param('id') id: string) {
    return this.clientPortalService.getTask(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      id,
    );
  }
}
