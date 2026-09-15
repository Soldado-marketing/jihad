import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { UsersService } from './users.service';
import { UpdateMeDto } from './dto/update-me.dto';

/**
 * Two different boundaries live on this controller.
 *
 * /me and PATCH /me are SELF: they read and write the caller's own row, so
 * authentication is the whole gate and no permission is declared. PermissionGuard
 * passes a route through untouched when it carries no @RequirePermission.
 *
 * /members is not self-scoped. It returns every active member of the tenant with
 * their display name, role and EMAIL ADDRESS, and it was reachable by any
 * authenticated member - a CLIENT included - which handed the client portal a
 * full staff roster. It is gated on MEMBERSHIP/READ, which under the current
 * defaults means OWNER only. Widening it to managers is a decision about the
 * permission matrix, not about this route.
 */
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.getMe(user.sub, user.tenantId);
  }

  @Get('members')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.MEMBERSHIP })
  listMembers(@CurrentUser() user: JwtPayload) {
    return this.usersService.listMembers(user.tenantId);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateMeDto) {
    return this.usersService.updateMe(user.sub, dto);
  }
}
