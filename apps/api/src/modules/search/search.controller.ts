import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { JwtPayload } from '../auth/auth.service';
import { SearchService } from './search.service';

/** AUTHENTICATED_USER; per-type permission and work scope are applied in the service. */
@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  find(
    @CurrentUser() user: JwtPayload,
    @Query('q') q?: string,
    @Query('types') types?: string,
    @Query('limit') limit?: string,
  ) {
    return this.search.search(user, q, types, limit);
  }
}
