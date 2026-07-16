import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { FollowUpStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { FollowUpsService } from './follow-ups.service';

@Controller('follow-ups')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class FollowUpsController {
  constructor(private readonly svc: FollowUpsService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.FOLLOW_UP })
  list(@CurrentUser() user: JwtPayload) { return this.svc.list(user.tenantId); }

  @Post()
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.FOLLOW_UP })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateFollowUpDto) { return this.svc.create(user.tenantId, user.sub, dto); }

  @Get(':id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.FOLLOW_UP })
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) { return this.svc.get(user.tenantId, id); }

  @Patch(':id')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.FOLLOW_UP })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: Partial<CreateFollowUpDto> & { status?: FollowUpStatus }) { return this.svc.update(user.tenantId, id, dto); }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission({ action: PermissionAction.DELETE, resource: PermissionResource.FOLLOW_UP })
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) { return this.svc.delete(user.tenantId, id); }
}