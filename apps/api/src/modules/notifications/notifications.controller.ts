import { Body, Controller, Get, Headers, Param, Patch, UseGuards } from '@nestjs/common';
import {
  actorContextFromHeaders,
  RequestHeaders,
  tenantContextFromHeaders,
} from '../../common/http/request-context';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { MarkNotificationReadDto } from './dto/mark-notification-read.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(PermissionGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.NOTIFICATION })
  listNotifications(@Headers() headers: RequestHeaders) {
    return this.notificationsService.listNotifications(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
    );
  }

  @Patch(':id/read')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.NOTIFICATION })
  markRead(
    @Headers() headers: RequestHeaders,
    @Param('id') id: string,
    @Body() dto: MarkNotificationReadDto,
  ) {
    return this.notificationsService.markRead(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      id,
      dto,
    );
  }
}
