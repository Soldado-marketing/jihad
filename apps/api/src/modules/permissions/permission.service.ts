import { Injectable } from '@nestjs/common';
import { ActorContext } from '../../common/auth/actor-context';
import { MembershipRole } from '../../common/identity/membership-role';
import { TenantContext } from '../../common/tenant/tenant-context';
import { PermissionAction, PermissionDecision, PermissionRequirement, PermissionResource } from './permission.types';

@Injectable()
export class PermissionService {
  decide(
    requirement: PermissionRequirement | undefined,
    actor: ActorContext | null,
    tenantContext: TenantContext | null,
  ): PermissionDecision {
    if (!requirement) {
      return {
        allowed: false,
        reason: 'permission_requirement_missing',
      };
    }

    if (!tenantContext?.tenantId) {
      return {
        allowed: false,
        reason: 'tenant_context_missing',
      };
    }

    if (!actor?.actorId || !actor.role) {
      return {
        allowed: false,
        reason: 'actor_context_missing',
      };
    }

    if (actor.tenantId !== tenantContext.tenantId) {
      return {
        allowed: false,
        reason: 'actor_tenant_mismatch',
      };
    }

    if (actor.role === MembershipRole.OWNER) {
      return {
        allowed: true,
        reason: 'owner_baseline_allow',
      };
    }

    if (actor.role === MembershipRole.CLIENT && this.isClientPortalRead(requirement)) {
      return {
        allowed: true,
        reason: 'client_own_client_visible_scope_placeholder',
      };
    }

    if (actor.role === MembershipRole.MANAGER && this.isManagerSafeDashboardReportAccess(requirement)) {
      return {
        allowed: true,
        reason: 'manager_safe_dashboard_report_placeholder',
      };
    }

    return this.restrictedRoleDecision(actor.role);
  }

  getBaselineRoles(): MembershipRole[] {
    return [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
      MembershipRole.EMPLOYEE,
      MembershipRole.CLIENT,
    ];
  }

  private restrictedRoleDecision(role: MembershipRole): PermissionDecision {
    const reasons: Record<MembershipRole, string> = {
      [MembershipRole.OWNER]: 'owner_baseline_allow',
      [MembershipRole.MANAGER]: 'manager_assigned_scope_placeholder',
      [MembershipRole.EMPLOYEE]: 'employee_own_assigned_scope_placeholder',
      [MembershipRole.CLIENT]: 'client_own_client_visible_scope_placeholder',
    };

    return {
      allowed: false,
      reason: reasons[role],
    };
  }

  private isClientPortalRead(requirement: PermissionRequirement): boolean {
    return (
      requirement.scope === 'client-portal' &&
      requirement.action === 'read' &&
      !requirement.sensitive
    );
  }

  private isManagerSafeDashboardReportAccess(requirement: PermissionRequirement): boolean {
    return (
      !requirement.sensitive &&
      ((requirement.resource === PermissionResource.DASHBOARD &&
        requirement.action === PermissionAction.READ) ||
        (requirement.resource === PermissionResource.REPORT &&
          requirement.action === PermissionAction.READ) ||
        (requirement.resource === PermissionResource.REPORT_RUN &&
          requirement.action === PermissionAction.CREATE))
    );
  }
}
