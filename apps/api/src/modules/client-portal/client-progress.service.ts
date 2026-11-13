/**
 * D08 - project status for the client portal.
 *
 * One read: the caller's shared projects, each with the number of shared work
 * steps per stage. The same two gates as every portal read apply, both
 * server-side: a row must be client-visible and inside the caller's client
 * scope, which ClientScopeService takes from the database membership only.
 *
 * - Numbers only. No task id, title, description, assignee, date or note
 *   leaves this service (see client-progress.ts for the stages).
 * - Appointments are tasks too, but the client has a page for them; they are
 *   not counted as work steps.
 * - A caller who may not read tasks in the portal receives the projects
 *   without numbers (`steps: null`).
 * - Read only. No row is written, no schema is added.
 */

import { Injectable } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { SHOOTING_LABEL } from '../appointments/appointment-format';
import { ClientScopeService } from '../memberships/client-scope.service';
import { PermissionService } from '../permissions/permission.service';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { PrismaService } from '../prisma/prisma.service';
import { countStages, emptyCounts, StageCounts } from './client-progress';

export interface ProjectProgress {
  id: string;
  name: string;
  status: string;
  steps: StageCounts | null;
}

@Injectable()
export class ClientProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientScope: ClientScopeService,
    private readonly permissions: PermissionService,
  ) {}

  async progress(tenantId: string, actorId: string, role: string): Promise<ProjectProgress[]> {
    const scope = await this.clientScope.resolve(tenantId, actorId, role);
    const scoped = scope === null ? {} : { clientScopeKey: scope };

    const projects = await this.prisma.project.findMany({
      where: { tenantId, clientVisible: true, ...scoped },
      select: { id: true, name: true, status: true },
      orderBy: { createdAt: 'desc' },
    });
    if (projects.length === 0) return [];

    const mayReadTasks = (await this.permissions.decide(
      { action: PermissionAction.READ, resource: PermissionResource.TASK, scope: 'client-portal' },
      actorId, tenantId, role,
    )).allowed;
    if (!mayReadTasks) return projects.map((p) => ({ ...p, steps: null }));

    const groups = await this.prisma.task.groupBy({
      by: ['projectId', 'status'],
      where: {
        tenantId,
        clientVisible: true,
        ...scoped,
        projectId: { in: projects.map((p) => p.id) },
        status: { not: TaskStatus.ARCHIVED },
        labels: { none: { label: { name: SHOOTING_LABEL } } },
      },
      _count: { _all: true },
    });

    const byProject = new Map<string, { status: string; count: number }[]>();
    for (const g of groups) {
      if (!g.projectId) continue;
      const rows = byProject.get(g.projectId) ?? [];
      rows.push({ status: g.status, count: g._count._all });
      byProject.set(g.projectId, rows);
    }
    return projects.map((p) => ({ ...p, steps: byProject.has(p.id) ? countStages(byProject.get(p.id)!) : emptyCounts() }));
  }
}
