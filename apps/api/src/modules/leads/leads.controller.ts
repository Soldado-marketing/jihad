import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CrmPipelineStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadsService } from './leads.service';

@Controller('leads')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.LEAD })
  listLeads(@CurrentUser() user: JwtPayload) {
    return this.leadsService.listLeads(user.tenantId);
  }

  @Post()
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.LEAD })
  createLead(@CurrentUser() user: JwtPayload, @Body() dto: CreateLeadDto) {
    return this.leadsService.createLead(user.tenantId, user.sub, dto);
  }

  @Get(':id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.LEAD })
  getLead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.leadsService.getLead(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.LEAD })
  updateLead(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: Partial<CreateLeadDto> & { status?: CrmPipelineStatus }) {
    return this.leadsService.updateLead(user.tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission({ action: PermissionAction.DELETE, resource: PermissionResource.LEAD })
  deleteLead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.leadsService.deleteLead(user.tenantId, id);
  }
}
