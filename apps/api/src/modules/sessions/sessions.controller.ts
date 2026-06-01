import { Body, Controller, Get, Post } from '@nestjs/common';
import { RevokeSessionDto } from './dto/revoke-session.dto';
import { SessionsService } from './sessions.service';

@Controller('sessions')
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
