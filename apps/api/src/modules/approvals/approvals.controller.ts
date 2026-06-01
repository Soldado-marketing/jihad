import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import {
  actorContextFromHeaders,
  RequestHeaders,
  tenantContextFromHeaders,
} from '../../common/http/request-context';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { ApprovalsService } from './approvals.service';
import { CreateApprovalDecisionDto } from './dto/create-approval-decision.dto';
import { CreateApprovalRequestDto } from './dto/create-approval-request.dto';

@Controller('approvals')
@UseGuards(PermissionGuard)
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.APPROVAL })
  listApprovals(@Headers() headers: RequestHeaders) {
    return this.approvalsService.listApprovals(tenantContextFromHeaders(headers));
  }

  @Post()
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.APPROVAL })
  createApproval(@Headers() headers: RequestHeaders, @Body() dto: CreateApprovalRequestDto) {
    return this.approvalsService.createApproval(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      dto,
    );
  }

  @Get(':id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.APPROVAL })
  getApproval(@Headers() headers: RequestHeaders, @Param('id') id: string) {
    return this.approvalsService.getApproval(tenantContextFromHeaders(headers), id);
  }

  @Post(':id/decision')
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.APPROVAL })
  createDecision(
    @Headers() headers: RequestHeaders,
    @Param('id') id: string,
    @Body() dto: CreateApprovalDecisionDto,
  ) {
    return this.approvalsService.createDecision(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      id,
      dto,
    );
  }
}
