import { Injectable } from '@nestjs/common';
import { RevokeSessionDto } from './dto/revoke-session.dto';

@Injectable()
export class SessionsService {
  getCurrentSessionPlaceholder() {
    return {
      status: 'current-session-placeholder',
    };
  }

  revokeSessionPlaceholder(dto: RevokeSessionDto) {
    return {
      sessionId: dto.sessionId,
      status: 'session-revoke-placeholder',
    };
  }
}
