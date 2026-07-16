import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_REQUIREMENT_KEY } from './permission.decorator';
import { PermissionService } from './permission.service';
import { PermissionRequirement } from './permission.types';
import { JwtPayload } from '../auth/auth.service';

interface AuthenticatedRequest {
  user?: JwtPayload;
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<PermissionRequirement>(
      PERMISSION_REQUIREMENT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @RequirePermission decorator — pass through (let JwtAuthGuard handle auth)
    if (!requirement) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    // Must be authenticated (JwtAuthGuard should run before PermissionGuard).
    // Context is sourced from the verified JWT payload (user.sub, user.tenantId, user.role).
    // Sprint 1B used raw x-tenant-id and x-actor-role headers; Sprint 13 replaced those with
    // JWT-sourced values so that stale or forged header values cannot bypass authorization.
    if (!user?.sub || !user.tenantId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', reason: 'actor_context_missing' });
    }

    // DB-backed decision — does NOT rely solely on JWT role
    const decision = await this.permissionService.decide(
      requirement,
      user.sub,
      user.tenantId,
      user.role,
    );

    if (!decision.allowed) {
      throw new ForbiddenException({ code: 'FORBIDDEN', reason: decision.reason });
    }

    return true;
  }
}
