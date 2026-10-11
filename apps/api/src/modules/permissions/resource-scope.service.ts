import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ActorContext } from '../../common/auth/actor-context';
import { MembershipRole } from '../../common/identity/membership-role';
import { TenantContext } from '../../common/tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';

export interface ResourceScopeInput {
  resourceTenantId: string;
  clientId?: string;
  assignedUserIds?: string[];
}

/**
 * Assigned-work scope of a CONTRACTOR (MAOS-T35, owner decision 2026-10-10:
 * contractors see only the items they are assigned to).
 *
 *   - memberProjectIds: projects the contractor is a ProjectMember of. Every
 *     task and file in these projects is visible.
 *   - visibleProjectIds: memberProjectIds plus the projects of tasks assigned
 *     to the contractor. Being assigned one task shows that project's own
 *     record, not its other tasks or files.
 *   - Tasks: assigned to the contractor, or in a member project.
 *   - Files: in a member project, or attached to a visible task.
 *
 * `null` means the caller is not scoped (every other internal role).
 */
export interface AssignedWorkScope {
  userId: string;
  memberProjectIds: string[];
  visibleProjectIds: string[];
}

export type WorkScope = AssignedWorkScope | null;

@Injectable()
export class ResourceScopeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the caller's scope from the database, not from the token: the
   * membership role is authoritative, so a role change applies at once. A
   * caller without an ACTIVE membership in the tenant is refused.
   */
  async resolveWorkScope(tenantId: string, userId: string): Promise<WorkScope> {
    const membership = await this.prisma.tenantMembership.findFirst({
      where: { tenantId, userId, status: 'ACTIVE' },
      select: { role: true },
    });
    if (!membership) {
      throw new ForbiddenException({ code: 'FORBIDDEN', reason: 'no_active_membership' });
    }
    if (membership.role !== MembershipRole.CONTRACTOR) return null;

    const [members, assigned] = await Promise.all([
      this.prisma.projectMember.findMany({ where: { tenantId, userId }, select: { projectId: true } }),
      this.prisma.task.findMany({
        where: { tenantId, assignedToUserId: userId, projectId: { not: null } },
        select: { projectId: true },
        distinct: ['projectId'],
      }),
    ]);
    const memberProjectIds = [...new Set(members.map((m) => m.projectId))];
    const visibleProjectIds = [
      ...new Set([...memberProjectIds, ...assigned.map((t) => t.projectId as string)]),
    ];
    return { userId, memberProjectIds, visibleProjectIds };
  }

  projectWhere(scope: WorkScope): Prisma.ProjectWhereInput {
    return scope ? { id: { in: scope.visibleProjectIds } } : {};
  }

  taskWhere(scope: WorkScope): Prisma.TaskWhereInput {
    return scope
      ? { OR: [{ assignedToUserId: scope.userId }, { projectId: { in: scope.memberProjectIds } }] }
      : {};
  }

  fileWhere(scope: WorkScope): Prisma.FileAssetWhereInput {
    return scope
      ? { OR: [{ projectId: { in: scope.memberProjectIds } }, { task: this.taskWhere(scope) }] }
      : {};
  }

  /**
   * A scoped caller may only place a task in a project they are a member of
   * (or leave it without a project). Refused as forbidden, not as a missing
   * record: the project is in the caller's tenant, they just may not use it.
   */
  assertMayUseProject(scope: WorkScope, projectId: string | null | undefined): void {
    if (!scope || projectId === undefined || projectId === null) return;
    if (!scope.memberProjectIds.includes(projectId)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', reason: 'project_not_assigned' });
    }
  }
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
      [MembershipRole.CONTRACTOR]: 'contractor_use_resolve_work_scope',
      [MembershipRole.CLIENT]: 'client_own_scope_not_implemented',
    };

    return reasons[role] ?? 'unknown_role_scope_not_implemented';
  }
}
