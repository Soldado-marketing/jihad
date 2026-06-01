import { Injectable } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';

@Injectable()
export class AuthService {
  loginPlaceholder(dto: LoginDto) {
    return {
      email: dto.email,
      nextStep: 'Implement invite-backed credential/session validation in Sprint 1A.',
      publicRegistration: false,
      status: 'login-placeholder',
    };
  }

  logoutPlaceholder(dto: LogoutDto) {
    return {
      sessionId: dto.sessionId ?? null,
      status: 'logout-placeholder',
    };
  }
}
