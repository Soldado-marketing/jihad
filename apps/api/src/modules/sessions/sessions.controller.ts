import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RevokeSessionDto } from './dto/revoke-session.dto';
import { SessionsService } from './sessions.service';

/**
 * Authorisation boundary: SELF.
 *
 * Both routes describe the caller's own session, so authentication is the whole
 * gate - there is no cross-user or cross-tenant read here and PermissionGuard
 * would reduce "see your own session" to an owner-only action.
 *
 * The bodies are still Sprint 1A placeholders, but the route is reachable from
 * the internet today and would have been reachable by anyone; the guard is what
 * keeps it from becoming a live unauthenticated endpoint the moment the
 * placeholder is filled in.
 */
@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get('current')
  getCurrentSession() {
    return this.sessionsService.getCurrentSessionPlaceholder();
  }

  @Post('revoke')
  revokeSession(@Body() dto: RevokeSessionDto) {
    return this.sessionsService.revokeSessionPlaceholder(dto);
  }
}
