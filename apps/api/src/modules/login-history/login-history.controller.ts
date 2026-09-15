import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { LoginHistoryService } from './login-history.service';

/**
 * Authorisation boundary: SELF.
 *
 * The route returns the caller's own login history, so authentication is the
 * gate. Login history is exactly the kind of record that must never be
 * readable without a session, placeholder body or not.
 */
@Controller('login-history')
@UseGuards(JwtAuthGuard)
export class LoginHistoryController {
  constructor(private readonly loginHistoryService: LoginHistoryService) {}

  @Get()
  listOwnLoginHistory() {
    return this.loginHistoryService.listOwnLoginHistoryPlaceholder();
  }
}
