import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ActorContext } from '../../common/auth/actor-context';
import { MembershipRole } from '../../common/identity/membership-role';
import { TenantContext } from '../../common/tenant/tenant-context';
import {
  PERMISSION_REQUIREMENT_KEY,
} from './permission.decorator';
import { PermissionService } from './permission.service';
import { PermissionRequirement } from './permission.types';

type HeaderValue = string | string[] | undefined;
type GuardRequest = {
  headers: Record<string, HeaderValue>;
};

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requirement = this.reflector.getAllAndOverride<PermissionRequirement>(
      PERMISSION_REQUIREMENT_KEY,
      [context.getHandler(), context.getClass()],
    );
    const request = context.switchToHttp().getRequest<GuardRequest>();
    const tenantContext = this.extractTenantContext(request.headers);
    const actor = this.extractActorContext(request.headers, tenantContext);
    const decision = this.permissionService.decide(requirement, actor, tenantContext);

    if (!decision.allowed) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        reason: decision.reason,
      });
    }

    return true;
  }

  private extractTenantContext(headers: Record<string, HeaderValue>): TenantContext | null {
    const tenantId = this.first(headers['x-tenant-id']);

    if (!tenantId) {
      return null;
    }

    return {
      actorId: this.first(headers['x-actor-id']),
      membershipId: this.first(headers['x-membership-id']),
      source: 'request-header',
      tenantId,
    };
  }

  private extractActorContext(
    headers: Record<string, HeaderValue>,
    tenantContext: TenantContext | null,
  ): ActorContext | null {
    const actorId = this.first(headers['x-actor-id']);
    const role = this.first(headers['x-actor-role']) as MembershipRole | undefined;

    if (!actorId || !role || !tenantContext?.tenantId) {
      return null;
    }

    return {
      actorId,
      deviceId: this.first(headers['x-device-id']),
      membershipId: this.first(headers['x-membership-id']),
      role,
      sessionId: this.first(headers['x-session-id']),
      tenantId: tenantContext.tenantId,
    };
  }

  private first(value: HeaderValue): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }
}
