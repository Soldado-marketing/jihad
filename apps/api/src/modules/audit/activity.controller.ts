import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { JwtPayload } from '../auth/auth.service';
import { ActivityService } from './activity.service';

/**
 * Authorisation boundary: PERMISSION_CONTROLLED, decided per request.
 *
 * The permission depends on the resource type in the path, so ActivityService
 * evaluates it with PermissionService instead of a static @RequirePermission.
 */
@Controller('activity')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get(':resourceType/:resourceId')
  timeline(
    @CurrentUser() user: JwtPayload,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.activity.timeline(user, resourceType, resourceId);
  }
}
