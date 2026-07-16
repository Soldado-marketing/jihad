import { ForbiddenException, Injectable } from '@nestjs/common';
import { ActorContext } from '../../common/auth/actor-context';
import { MembershipRole } from '../../common/identity/membership-role';
import { TenantContext } from '../../common/tenant/tenant-context';

export interface ResourceScopeInput {
  resourceTenantId: string;
  clientId?: string;
  assignedUserIds?: string[];
}

@Injectable()
export class ResourceScopeService {
  validateTenantOwnership(context: TenantContext, resource: ResourceScopeInput): void {
    if (!context?.tenantId || context.tenantId !== resource.resourceTenantId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        reason: 'resource_tenant_scope_mismatch',
      });
    }
  }

  validateActorScope(actor: ActorContext, resource: ResourceScopeInput): void {
    this.validateTenantOwnership(
      {
        actorId: actor.actorId,
        membershipId: actor.membershipId,
        source: 'request-header',
        tenantId: actor.tenantId,
      },
      resource,
    );

    if (actor.role === MembershipRole.OWNER) {
      return;
    }

    throw new ForbiddenException({
      code: 'FORBIDDEN',
      reason: this.placeholderReason(actor.role),
    });
  }

  private placeholderReason(role: MembershipRole): string {
    const reasons: Record<MembershipRole, string> = {
      [MembershipRole.OWNER]: 'owner_baseline_allow',
      [MembershipRole.MANAGER]: 'manager_assigned_scope_not_implemented',
      [MembershipRole.EMPLOYEE]: 'employee_own_assigned_scope_not_implemented',
      [MembershipRole.CONTRACTOR]: 'contractor_assigned_scope_not_implemented',
      [MembershipRole.CLIENT]: 'client_own_scope_not_implemented',
    };

    return reasons[role] ?? 'unknown_role_scope_not_implemented';
  }
}
