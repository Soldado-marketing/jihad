import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { FilesService } from './files.service';

@Controller('files')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class FilesController {
  constructor(private readonly svc: FilesService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.FILE })
  list(@CurrentUser() user: JwtPayload) { return this.svc.list(user.tenantId); }

  @Post()
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.FILE })
  create(@CurrentUser() user: JwtPayload, @Body() dto: { name: string; mimeType?: string; projectId?: string; taskId?: string }) {
    return this.svc.create(user.tenantId, user.sub, dto);
  }

  @Get(':id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.FILE })
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) { return this.svc.get(user.tenantId, id); }

  @Patch(':id')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.FILE })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: { name?: string }) {
    return this.svc.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission({ action: PermissionAction.DELETE, resource: PermissionResource.FILE })
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) { return this.svc.delete(user.tenantId, id); }
}
