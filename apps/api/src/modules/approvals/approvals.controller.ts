import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { ApprovalsService } from './approvals.service';
import { CreateApprovalDecisionDto } from './dto/create-approval-decision.dto';
import { CreateApprovalRequestDto } from './dto/create-approval-request.dto';

@Controller('approvals')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ApprovalsController {
  constructor(private readonly svc: ApprovalsService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.APPROVAL })
  list(@CurrentUser() user: JwtPayload) { return this.svc.list(user.tenantId); }

  @Post()
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.APPROVAL })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateApprovalRequestDto) {
    return this.svc.create(user.tenantId, user.sub, dto);
  }

  /** Whether the caller is an approver in this company. */
  @Get('me')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.APPROVAL })
  me(@CurrentUser() user: JwtPayload) { return this.svc.me(user.tenantId, user.sub); }

  @Get(':id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.APPROVAL })
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) { return this.svc.get(user.tenantId, id); }

  // READ at the guard: who may decide is the approver rule in the service
  // (OWNER or an explicit decide-approvals grant), not the CREATE default.
  @Post(':id/decision')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.APPROVAL })
  decide(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: CreateApprovalDecisionDto) {
    return this.svc.decide(user.tenantId, user.sub, id, dto);
  }
}
