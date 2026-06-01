import { Injectable } from '@nestjs/common';

@Injectable()
export class LoginHistoryService {
  listOwnLoginHistoryPlaceholder() {
    return {
      scope: 'own-login-history-only',
      status: 'login-history-placeholder',
    };
  }
}
