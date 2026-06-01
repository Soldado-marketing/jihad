import { Controller, Get } from '@nestjs/common';
import { LoginHistoryService } from './login-history.service';

@Controller('login-history')
export class LoginHistoryController {
  constructor(private readonly loginHistoryService: LoginHistoryService) {}

  @Get()
  listOwnLoginHistory() {
    return this.loginHistoryService.listOwnLoginHistoryPlaceholder();
  }
}
