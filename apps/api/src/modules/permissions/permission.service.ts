import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipRole } from '../../common/identity/membership-role';
import {
  PermissionAction,
  PermissionDecision,
  PermissionRequirement,
  PermissionResource,
  VisibilityScope,
} from './permission.types';

// Resources that MANAGER can fully read + write (non-sensitive).
const MANAGER_WRITE_RESOURCES = new Set<PermissionResource>([
  PermissionResource.PROJECT,
  PermissionResource.TASK,
  PermissionResource.SUBTASK,
  PermissionResource.LEAD,
  PermissionResource.OPPORTUNITY,
  PermissionResource.MEETING,
  PermissionResource.FOLLOW_UP,
  PermissionResource.INTERNAL_NOTE,
  PermissionResource.FILE,
  PermissionResource.FILE_VERSION,
  PermissionResource.APPROVAL,
  PermissionResource.CHAT_CHANNEL,
  PermissionResource.CHAT_MESSAGE,
  PermissionResource.NOTIFICATION,
  PermissionResource.VOICE_NOTE,
  PermissionResource.VOICE_TO_TASK_DRAFT,
  PermissionResource.INVOICE,
  PermissionResource.PAYMENT,
  PermissionResource.DASHBOARD,
  PermissionResource.DASHBOARD_WIDGET,
  PermissionResource.REPORT,
  PermissionResource.REPORT_RUN,
]);

// Resources that EMPLOYEE can read + write (non-sensitive, non-finance).
const EMPLOYEE_WRITE_RESOURCES = new Set<PermissionResource>([
  PermissionResource.TASK,
  PermissionResource.SUBTASK,
  PermissionResource.INTERNAL_NOTE,
  PermissionResource.FILE,
  PermissionResource.FILE_VERSION,
  PermissionResource.CHAT_MESSAGE,
  PermissionResource.NOTIFICATION,
  PermissionResource.VOICE_NOTE,
  PermissionResource.VOICE_TO_TASK_DRAFT,
  PermissionResource.DASHBOARD,
]);

// Resources that EMPLOYEE can READ (but not write) in addition to write set.
const EMPLOYEE_READ_RESOURCES = new Set<PermissionResource>([
  PermissionResource.PROJECT,
  PermissionResource.APPROVAL,
  PermissionResource.CHAT_CHANNEL,
  PermissionResource.REPORT,
]);

// Resources CONTRACTOR can access (read + task write).
const CONTRACTOR_WRITE_RESOURCES = new Set<PermissionResource>([
  PermissionResource.TASK,
  PermissionResource.SUBTASK,
  PermissionResource.CHAT_MESSAGE,
  PermissionResource.NOTIFICATION,
  PermissionResource.DASHBOARD,
]);

const CONTRACTOR_READ_RESOURCES = new Set<PermissionResource>([
  PermissionResource.PROJECT,
  PermissionResource.FILE,
  PermissionResource.CHAT_CHANNEL,
]);

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * DB-backed authorization.
   * For OWNER: allow immediately (no DB lookup needed).
   * For all other roles: load TenantMembership + MembershipPermission rows from DB.
   * JWT role field is used only to fast-path OWNER; all non-Owner decisions
   * require a live DB lookup so revoked/changed permissions are enforced instantly.
   */
  async decide(
    requirement: PermissionRequirement | undefined,
    userId: string | undefined,
    tenantId: string | undefined,
    jwtRole: string | undefined,
  ): Promise<PermissionDecision> {
    if (!requirement) {
      return { allowed: false, reason: 'permission_requirement_missing' };
    }
    if (!tenantId) {
      return { allowed: false, reason: 'tenant_context_missing' };
    }
    if (!userId) {
      return { allowed: false, reason: 'actor_context_missing' };
    }

    // Fast-path: OWNER always allowed (verified from JWT + membership below)
    if (jwtRole === MembershipRole.OWNER) {
      const ownerMembership = await this.prisma.tenantMembership.findUnique({
        where: { tenantId_userId: { tenantId, userId } },
        select: { role: true, status: true, visibilityScope: true },
      });
      if (ownerMembership?.role === MembershipRole.OWNER && ownerMembership.status === 'ACTIVE') {
        return {
          allowed: true,
          reason: 'owner_baseline_allow',
          visibilityScope: ownerMembership.visibilityScope,
        };
      }
      return { allowed: false, reason: 'owner_claim_not_verified' };
    }

    // For non-Owner roles: load membership + custom permission grants from DB
    const membership = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      select: {
        id: true,
        role: true,
        status: true,
        visibilityScope: true,
        permissions: {
          where: {
            action: requirement.action,
            resource: requirement.resource,
          },
          select: { granted: true },
        },
      },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      return { allowed: false, reason: 'membership_not_found_or_inactive' };
    }

    const scope = membership.visibilityScope;

    // Custom permission grant takes precedence over role defaults
    const grant = membership.permissions[0];
    if (grant !== undefined) {
      return {
        allowed: grant.granted,
        reason: grant.granted ? 'custom_permission_grant' : 'custom_permission_deny',
        visibilityScope: scope,
      };
    }

    // No custom grant — apply role-based defaults
    return this.roleDefaultDecision(membership.role, requirement, scope);
  }

  getBaselineRoles(): MembershipRole[] {
    return [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
      MembershipRole.EMPLOYEE,
      MembershipRole.CONTRACTOR,
      MembershipRole.CLIENT,
    ];
  }

  private roleDefaultDecision(
    role: MembershipRole,
    requirement: PermissionRequirement,
    scope: VisibilityScope,
  ): PermissionDecision {
    const { action, resource, sensitive } = requirement;

    // CLIENT: read-only access to client-portal scoped resources only.
    if (role === MembershipRole.CLIENT) {
      if (requirement.scope === 'client-portal' && action === PermissionAction.READ && !sensitive) {
        return { allowed: true, reason: 'client_portal_read_default', visibilityScope: scope };
      }
      return { allowed: false, reason: 'client_non_portal_deny', visibilityScope: scope };
    }

    // Sensitive finance data: OWNER only. All non-OWNER roles denied.
    if (sensitive) {
      return { allowed: false, reason: 'sensitive_non_owner_deny', visibilityScope: scope };
    }

    // MANAGER: broad access to all non-sensitive workspace resources.
    if (role === MembershipRole.MANAGER) {
      if (MANAGER_WRITE_RESOURCES.has(resource)) {
        return { allowed: true, reason: 'manager_default_grant', visibilityScope: scope };
      }
      return { allowed: false, reason: 'manager_resource_not_in_default_set', visibilityScope: scope };
    }

    // EMPLOYEE: write access to task/notes/files/chat/voice; read access to projects/approvals/channels.
    if (role === MembershipRole.EMPLOYEE) {
      if (EMPLOYEE_WRITE_RESOURCES.has(resource)) {
        return { allowed: true, reason: 'employee_default_grant', visibilityScope: scope };
      }
      if (EMPLOYEE_READ_RESOURCES.has(resource) && action === PermissionAction.READ) {
        return { allowed: true, reason: 'employee_read_default_grant', visibilityScope: scope };
      }
      return { allowed: false, reason: 'employee_resource_not_in_default_set', visibilityScope: scope };
    }

    // CONTRACTOR: write tasks/subtasks/chat; read projects/files/channels.
    if (role === MembershipRole.CONTRACTOR) {
      if (CONTRACTOR_WRITE_RESOURCES.has(resource)) {
        return { allowed: true, reason: 'contractor_default_grant', visibilityScope: scope };
      }
      if (CONTRACTOR_READ_RESOURCES.has(resource) && action === PermissionAction.READ) {
        return { allowed: true, reason: 'contractor_read_default_grant', visibilityScope: scope };
      }
      return { allowed: false, reason: 'contractor_resource_not_in_default_set', visibilityScope: scope };
    }

    return { allowed: false, reason: `${role.toLowerCase()}_no_default_grant`, visibilityScope: scope };
  }
}
