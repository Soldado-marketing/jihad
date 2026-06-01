import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import {
  actorContextFromHeaders,
  RequestHeaders,
  tenantContextFromHeaders,
} from '../../common/http/request-context';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { MeetingsService } from './meetings.service';

@Controller('crm/meetings')
@UseGuards(PermissionGuard)
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.MEETING })
  listMeetings(@Headers() headers: RequestHeaders) {
    return this.meetingsService.listMeetings(tenantContextFromHeaders(headers));
  }

  @Post()
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.MEETING })
  createMeeting(@Headers() headers: RequestHeaders, @Body() dto: CreateMeetingDto) {
    return this.meetingsService.createMeeting(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      dto,
    );
  }
}
