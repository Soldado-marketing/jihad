import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { JwtPayload } from '../auth/auth.service';
import { LoginHistoryService } from './login-history.service';

/**
 * Authorisation boundary: SELF.
 *
 * The route returns the caller's own login history, so authentication is the
 * gate. Login history is exactly the kind of record that must never be
 * readable without a session. Only the caller's own entries are returned.
 */
@Controller('login-history')
@UseGuards(JwtAuthGuard)
export class LoginHistoryController {
  constructor(private readonly loginHistoryService: LoginHistoryService) {}

  @Get()
  listOwnLoginHistory(@CurrentUser() user: JwtPayload) {
    return this.loginHistoryService.listOwn(user.sub);
  }
}
