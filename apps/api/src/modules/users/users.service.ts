import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  // Sprint 1A creates users only through invite acceptance. Public registration is intentionally unsupported.
  getInviteOnlyAccountCreationPolicy() {
    return {
      accountCreation: 'invite-only',
      publicRegistration: false,
    };
  }
}
