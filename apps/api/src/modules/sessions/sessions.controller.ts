import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { JwtPayload } from '../auth/auth.service';
import { RevokeSessionDto } from './dto/revoke-session.dto';
import { SessionsService } from './sessions.service';

/**
 * Authorisation boundary: SELF.
 *
 * Every route acts on the caller's own sessions in the tenant of the access
 * token, so authentication is the whole gate - the service filters by user
 * and tenant, and PermissionGuard would reduce "manage your own sessions" to
 * an owner-only action.
 */
@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  listSessions(@CurrentUser() user: JwtPayload) {
    return this.sessionsService.listOwn(user);
  }

  @Get('current')
  getCurrentSession(@CurrentUser() user: JwtPayload) {
    return this.sessionsService.current(user);
  }

  @Post('revoke')
  @HttpCode(200)
  revokeSession(@CurrentUser() user: JwtPayload, @Body() dto: RevokeSessionDto) {
    return this.sessionsService.revokeOwn(user, dto.sessionId);
  }
}
