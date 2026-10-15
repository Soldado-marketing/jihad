import { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Fields every project read returns; budgetCents is removed for non-OWNERs by the service. */
const ENRICHED = {
  serviceType: true,
  budgetCents: true,
  deadline: true,
  projectNumber: true,
  owner: { select: { id: true, displayName: true } },
  customer: { select: { id: true, name: true } },
} satisfies Prisma.ProjectSelect;

export type ProjectWrite = Prisma.ProjectUncheckedUpdateInput;

@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, scope: Prisma.ProjectWhereInput = {}, taskScope: Prisma.TaskWhereInput = {}) {
    return this.prisma.project.findMany({
      where: { tenantId, AND: [scope] },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        clientVisible: true,
        createdAt: true,
        updatedAt: true,
        ...ENRICHED,
        _count: { select: { tasks: { where: taskScope } } },
      },
    });
  }

  create(tenantId: string, data: Omit<Prisma.ProjectUncheckedCreateInput, 'tenantId'>) {
    return this.prisma.project.create({ data: { ...data, tenantId }, select: { id: true } });
  }

  getById(tenantId: string, id: string, scope: Prisma.ProjectWhereInput = {}, taskScope: Prisma.TaskWhereInput = {}) {
    return this.prisma.project.findFirst({
      where: { id, tenantId, AND: [scope] },
      include: {
        tasks: {
          where: taskScope,
          select: { id: true, title: true, status: true, priority: true, dueAt: true, clientVisible: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        owner: ENRICHED.owner,
        customer: ENRICHED.customer,
        _count: { select: { tasks: { where: taskScope } } },
      },
    });
  }

  update(tenantId: string, id: string, data: ProjectWrite) {
    return this.prisma.project.update({ where: { id, tenantId }, data, select: { id: true } });
  }

  delete(tenantId: string, id: string) {
    // Only the id: a deleted row must not carry budgetCents back to any caller.
    return this.prisma.project.delete({ where: { id, tenantId }, select: { id: true } });
  }

  /** Task counts per project and status, within the caller's task scope. */
  taskStatusCounts(tenantId: string, projectIds: string[], taskScope: Prisma.TaskWhereInput = {}) {
    if (projectIds.length === 0) return Promise.resolve([]);
    return this.prisma.task.groupBy({
      by: ['projectId', 'status'],
      where: { tenantId, projectId: { in: projectIds }, AND: [taskScope] },
      _count: { _all: true },
    });
  }

  /** The highest automatic number ("P-0007") in the tenant, or 0. */
  async maxAutoNumber(tenantId: string): Promise<number> {
    const rows = await this.prisma.project.findMany({
      where: { tenantId, projectNumber: { startsWith: 'P-' } },
      select: { projectNumber: true },
    });
    return rows.reduce((max, r) => {
      const m = /^P-(\d{1,9})$/.exec(r.projectNumber ?? '');
      return m ? Math.max(max, Number(m[1])) : max;
    }, 0);
  }

  membership(tenantId: string, userId: string) {
    return this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      select: { role: true, status: true },
    });
  }

  customer(tenantId: string, id: string) {
    return this.prisma.customer.findFirst({ where: { id, tenantId }, select: { id: true, status: true, clientScopeKey: true } });
  }
}
