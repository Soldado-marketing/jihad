import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CrmPipelineStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { OpportunitiesService } from './opportunities.service';

@Controller('opportunities')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class OpportunitiesController {
  constructor(private readonly svc: OpportunitiesService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.OPPORTUNITY })
  list(@CurrentUser() user: JwtPayload) { return this.svc.list(user.tenantId); }

  @Post()
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.OPPORTUNITY })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateOpportunityDto) { return this.svc.create(user.tenantId, user.sub, dto); }

  @Get(':id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.OPPORTUNITY })
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) { return this.svc.get(user.tenantId, id); }

  @Patch(':id')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.OPPORTUNITY })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: Partial<CreateOpportunityDto> & { status?: CrmPipelineStatus }) { return this.svc.update(user.tenantId, id, dto); }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission({ action: PermissionAction.DELETE, resource: PermissionResource.OPPORTUNITY })
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) { return this.svc.delete(user.tenantId, id); }
}
