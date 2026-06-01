import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import {
  actorContextFromHeaders,
  RequestHeaders,
  tenantContextFromHeaders,
} from '../../common/http/request-context';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { FollowUpsService } from './follow-ups.service';

@Controller('crm/follow-ups')
@UseGuards(PermissionGuard)
export class FollowUpsController {
  constructor(private readonly followUpsService: FollowUpsService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.FOLLOW_UP })
  listFollowUps(@Headers() headers: RequestHeaders) {
    return this.followUpsService.listFollowUps(tenantContextFromHeaders(headers));
  }

  @Post()
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.FOLLOW_UP })
  createFollowUp(@Headers() headers: RequestHeaders, @Body() dto: CreateFollowUpDto) {
    return this.followUpsService.createFollowUp(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      dto,
    );
  }
}
