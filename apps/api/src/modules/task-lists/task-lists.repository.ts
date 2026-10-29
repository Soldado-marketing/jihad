import { Injectable } from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const ORDER_STEP = 1000;

/** The lists a project's board starts with: the former fixed columns, mapped to their statuses. */
export const DEFAULT_LISTS: { name: string; status: TaskStatus }[] = [
  { name: 'To Do', status: TaskStatus.TODO },
  { name: 'In Progress', status: TaskStatus.IN_PROGRESS },
  { name: 'In Review', status: TaskStatus.IN_REVIEW },
  { name: 'Blocked', status: TaskStatus.BLOCKED },
  { name: 'Done', status: TaskStatus.DONE },
];

const LIST_SELECT = {
  id: true,
  projectId: true,
  name: true,
  sortOrder: true,
  status: true,
  archivedAt: true,
} satisfies Prisma.TaskListSelect;

@Injectable()
export class TaskListsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, projectId: string, includeArchived: boolean) {
    return this.prisma.taskList.findMany({
      where: { tenantId, projectId, ...(includeArchived ? {} : { archivedAt: null }) },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: LIST_SELECT,
    });
  }

  findInTenant(tenantId: string, id: string, project: Prisma.ProjectWhereInput) {
    return this.prisma.taskList.findFirst({
      where: { id, tenantId, project },
      select: LIST_SELECT,
    });
  }

  /**
   * Creates the default lists when the project has none, archived ones
   * included. A transaction-scoped advisory lock on the project makes two
   * concurrent calls create them once. Existing tasks are not touched: a task
   * without a list shows in the list mapped to its status.
   */
  initialize(tenantId: string, projectId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`task-lists:${projectId}`}))`;
      const existing = await tx.taskList.count({ where: { tenantId, projectId } });
      if (existing > 0) return false;
      await tx.taskList.createMany({
        data: DEFAULT_LISTS.map((l, i) => ({ tenantId, projectId, name: l.name, status: l.status, sortOrder: (i + 1) * ORDER_STEP })),
      });
      return true;
    });
  }

  async nextSortOrder(tenantId: string, projectId: string) {
    const last = await this.prisma.taskList.aggregate({ where: { tenantId, projectId }, _max: { sortOrder: true } });
    return (last._max.sortOrder ?? 0) + ORDER_STEP;
  }

  async create(tenantId: string, projectId: string, name: string, status: TaskStatus | undefined) {
    return this.prisma.taskList.create({
      data: { tenantId, projectId, name, status, sortOrder: await this.nextSortOrder(tenantId, projectId) },
      select: LIST_SELECT,
    });
  }

  update(tenantId: string, id: string, data: Prisma.TaskListUpdateManyMutationInput) {
    return this.prisma.taskList.update({ where: { id, tenantId }, data, select: LIST_SELECT });
  }

  reorder(tenantId: string, ids: string[]) {
    return this.prisma.$transaction(
      ids.map((id, i) =>
        this.prisma.taskList.update({ where: { id, tenantId }, data: { sortOrder: (i + 1) * ORDER_STEP }, select: LIST_SELECT }),
      ),
    );
  }

  countActive(tenantId: string, projectId: string, ids: string[]) {
    return this.prisma.taskList.count({ where: { tenantId, projectId, archivedAt: null, id: { in: ids } } });
  }

  activeCount(tenantId: string, projectId: string) {
    return this.prisma.taskList.count({ where: { tenantId, projectId, archivedAt: null } });
  }
}
