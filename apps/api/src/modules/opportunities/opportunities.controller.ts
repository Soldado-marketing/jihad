import { Body, Controller, Get, Headers, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  actorContextFromHeaders,
  RequestHeaders,
  tenantContextFromHeaders,
} from '../../common/http/request-context';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { OpportunitiesService } from './opportunities.service';

@Controller('crm/opportunities')
@UseGuards(PermissionGuard)
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.OPPORTUNITY })
  listOpportunities(@Headers() headers: RequestHeaders) {
    return this.opportunitiesService.listOpportunities(tenantContextFromHeaders(headers));
  }

  @Post()
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.OPPORTUNITY })
  createOpportunity(@Headers() headers: RequestHeaders, @Body() dto: CreateOpportunityDto) {
    return this.opportunitiesService.createOpportunity(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      dto,
    );
  }

  @Get(':id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.OPPORTUNITY })
  getOpportunity(@Headers() headers: RequestHeaders, @Param('id') id: string) {
    return this.opportunitiesService.getOpportunity(tenantContextFromHeaders(headers), id);
  }

  @Patch(':id')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.OPPORTUNITY })
  updateOpportunity(
    @Headers() headers: RequestHeaders,
    @Param('id') id: string,
    @Body() dto: UpdateOpportunityDto,
  ) {
    return this.opportunitiesService.updateOpportunity(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      id,
      dto,
    );
  }
}
