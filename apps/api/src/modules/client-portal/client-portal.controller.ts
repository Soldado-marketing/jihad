import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { ClientPortalService } from './client-portal.service';

@Controller('client')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ClientPortalController {
  constructor(private readonly clientPortalService: ClientPortalService) {}

  @Get('projects')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.PROJECT, scope: 'client-portal' })
  listProjects(@CurrentUser() user: JwtPayload) {
    return this.clientPortalService.listProjects(user.tenantId, user.sub);
  }

  @Get('projects/:id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.PROJECT, scope: 'client-portal' })
  getProject(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.clientPortalService.getProject(user.tenantId, user.sub, id);
  }

  @Get('tasks')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.TASK, scope: 'client-portal' })
  listTasks(@CurrentUser() user: JwtPayload) {
    return this.clientPortalService.listTasks(user.tenantId, user.sub);
  }

  @Get('tasks/:id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.TASK, scope: 'client-portal' })
  getTask(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.clientPortalService.getTask(user.tenantId, user.sub, id);
  }
}
