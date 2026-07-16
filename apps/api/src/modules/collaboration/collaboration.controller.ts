import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { CollaborationService } from './collaboration.service';

@Controller('collaboration/notes')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CollaborationController {
  constructor(private readonly svc: CollaborationService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.INTERNAL_NOTE })
  list(@CurrentUser() user: JwtPayload, @Query('resourceType') rt?: string, @Query('resourceId') rid?: string) {
    return this.svc.listNotes(user.tenantId, rt, rid);
  }

  @Post()
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.INTERNAL_NOTE })
  create(@CurrentUser() user: JwtPayload, @Body() dto: { body: string; resourceType?: string; resourceId?: string; threadKey?: string }) {
    return this.svc.createNote(user.tenantId, user.sub, dto.body, dto.resourceType, dto.resourceId, dto.threadKey);
  }

  @Get(':id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.INTERNAL_NOTE })
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) { return this.svc.getNote(user.tenantId, id); }

  @Patch(':id')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.INTERNAL_NOTE })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: { body: string }) {
    return this.svc.updateNote(user.tenantId, id, dto.body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission({ action: PermissionAction.DELETE, resource: PermissionResource.INTERNAL_NOTE })
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) { return this.svc.deleteNote(user.tenantId, id); }
}