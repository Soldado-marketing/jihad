import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { JwtPayload } from '../auth/auth.service';
import { CalendarService } from './calendar.service';

/**
 * Authorisation boundary: PERMISSION_CONTROLLED per event type, decided in
 * CalendarService (each type needs the permission that normally reads it).
 */
@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @Get()
  events(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('types') types?: string,
  ) {
    return this.calendar.events(user, from, to, types);
  }
}
