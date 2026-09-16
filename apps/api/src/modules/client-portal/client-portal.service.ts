/**
 * Client-portal reads.
 *
 * Two gates, both server-side: the row must be client-visible, and it must
 * belong to the caller's client scope. The scope is resolved from the database
 * membership by ClientScopeService - never from anything the caller sent.
 *
 * Before Gate 3 these queries filtered on tenantId alone, which meant every
 * CLIENT in a tenant saw every other client's projects and tasks.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { ClientScope, ClientScopeService } from '../memberships/client-scope.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientScope: ClientScopeService,
  ) {}

  /**
   * A string scope narrows the query to that client. null means the caller is an
   * internal role, which already reads everything through the internal API, so
   * no extra filter is added. A CLIENT never reaches here with null - resolve()
   * throws instead.
   */
  private scopeFilter(scope: ClientScope) {
    return scope === null ? {} : { clientScopeKey: scope };
  }

  async listProjects(tenantId: string, actorId: string, role: string) {
    const scope = await this.clientScope.resolve(tenantId, actorId, role);

    return this.prisma.project.findMany({
      where: { tenantId, clientVisible: true, ...this.scopeFilter(scope) },
      select: { id: true, name: true, status: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProject(tenantId: string, actorId: string, role: string, id: string) {
    const scope = await this.clientScope.resolve(tenantId, actorId, role);

    const project = await this.prisma.project.findFirst({
      where: { id, tenantId, clientVisible: true, ...this.scopeFilter(scope) },
      select: { id: true, name: true, status: true, description: true },
    });

    // A row outside the caller's scope is reported as absent rather than
    // returned as an empty 200, so the route cannot be used to confirm that an
    // id exists in another client's world.
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async listTasks(tenantId: string, actorId: string, role: string) {
    const scope = await this.clientScope.resolve(tenantId, actorId, role);

    return this.prisma.task.findMany({
      where: { tenantId, clientVisible: true, ...this.scopeFilter(scope) },
      select: { id: true, title: true, status: true, projectId: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTask(tenantId: string, actorId: string, role: string, id: string) {
    const scope = await this.clientScope.resolve(tenantId, actorId, role);

    const task = await this.prisma.task.findFirst({
      where: { id, tenantId, clientVisible: true, ...this.scopeFilter(scope) },
      select: { id: true, title: true, status: true, projectId: true, description: true },
    });

    if (!task) throw new NotFoundException('Task not found');
    return task;
  }
}
