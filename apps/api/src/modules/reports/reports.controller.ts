import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.REPORT })
  list(@CurrentUser() user: JwtPayload) { return this.svc.list(user.tenantId); }

  @Post()
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.REPORT })
  create(@CurrentUser() user: JwtPayload, @Body() dto: { name: string }) {
    return this.svc.create(user.tenantId, user.sub, dto.name);
  }

  @Get(':id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.REPORT })
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) { return this.svc.get(user.tenantId, id); }

  @Post(':id/run')
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.REPORT_RUN })
  run(@CurrentUser() user: JwtPayload, @Param('id') id: string) { return this.svc.run(user.tenantId, id, user.sub); }
}
