import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService, JwtPayload } from '../../modules/auth/auth.service';
import { validateJwtSecret } from '../config/jwt-secret';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: validateJwtSecret(config.get<string>('JWT_SECRET')),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const liveRole = await this.authService.validateSession(payload.sessionId, payload);
    if (!liveRole) throw new UnauthorizedException('Session expired or revoked');
    // Role is reloaded on every request: a demotion must never retain an old
    // OWNER claim, and an authorized role change needn't force logout.
    return { ...payload, role: liveRole };
  }
}
