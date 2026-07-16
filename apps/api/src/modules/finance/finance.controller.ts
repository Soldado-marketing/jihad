import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { FinanceService } from './finance.service';

@Controller('finance')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class FinanceController {
  constructor(private readonly svc: FinanceService) {}

  @Get('summary')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.FINANCE, sensitive: true })
  summary(@CurrentUser() user: JwtPayload) { return this.svc.getSummary(user.tenantId); }

  @Get('revenue')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.FINANCE, sensitive: true })
  revenue(@CurrentUser() user: JwtPayload) { return this.svc.listRevenue(user.tenantId); }

  @Get('costs')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.FINANCE, sensitive: true })
  costs(@CurrentUser() user: JwtPayload) { return this.svc.listCosts(user.tenantId); }
}
