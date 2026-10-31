import { ForbiddenException, Injectable } from '@nestjs/common';
import { PermissionService } from '../permissions/permission.service';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { PrismaService } from '../prisma/prisma.service';

const DAY_MS = 24 * 60 * 60 * 1000;
/** "Due soon" horizon and the cap on each list. */
const SOON_DAYS = 7;
const LIST_LIMIT = 20;
const CLOSED_TASK_STATUSES = ['DONE', 'ARCHIVED'] as const;

export interface MyWorkCaller {
  sub: string;
  tenantId: string;
  role: string;
}

const TASK_SELECT = {
  id: true,
  title: true,
  status: true,
  priority: true,
  dueAt: true,
  project: { select: { id: true, name: true } },
} as const;

/**
 * My Work (MAOS-T67): one read over the caller's own work. Every section is
 * filtered to the caller (their assigned tasks, their follow-ups, their
 * notifications) and gated by the permission that normally reads it, so a
 * role without APPROVAL or FOLLOW_UP read gets an empty section. CLIENT users
 * have the client portal instead and are refused. Read-only: nothing is created.
 */
@Injectable()
export class MyWorkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
  ) {}

  async overview(caller: MyWorkCaller, now = new Date()) {
    const can = async (action: PermissionAction, resource: PermissionResource) =>
      (await this.permissions.decide({ action, resource }, caller.sub, caller.tenantId, caller.role)).allowed;

    if (!(await can(PermissionAction.READ, PermissionResource.TASK))) {
      throw new ForbiddenException({ code: 'FORBIDDEN', reason: 'my_work_internal_only' });
    }
    const [readApprovals, decideApprovals, readFollowUps] = await Promise.all([
      can(PermissionAction.READ, PermissionResource.APPROVAL),
      this.permissions.mayDecideApprovals(caller.tenantId, caller.sub),
      can(PermissionAction.READ, PermissionResource.FOLLOW_UP),
    ]);

    const { tenantId, sub: userId } = caller;
    const soon = new Date(now.getTime() + SOON_DAYS * DAY_MS);
    const mine = { tenantId, assignedToUserId: userId, status: { notIn: [...CLOSED_TASK_STATUSES] } };

    const [overdue, dueSoon, blocked, open, toDecide, requested, followUps, unread, latest] = await Promise.all([
      this.prisma.task.findMany({
        where: { ...mine, status: { notIn: [...CLOSED_TASK_STATUSES, 'BLOCKED'] }, dueAt: { lt: now } },
        orderBy: { dueAt: 'asc' },
        take: LIST_LIMIT,
        select: TASK_SELECT,
      }),
      this.prisma.task.findMany({
        where: { ...mine, status: { notIn: [...CLOSED_TASK_STATUSES, 'BLOCKED'] }, dueAt: { gte: now, lte: soon } },
        orderBy: { dueAt: 'asc' },
        take: LIST_LIMIT,
        select: TASK_SELECT,
      }),
      this.prisma.task.findMany({
        where: { ...mine, status: 'BLOCKED' },
        orderBy: { updatedAt: 'desc' },
        take: LIST_LIMIT,
        select: TASK_SELECT,
      }),
      this.prisma.task.findMany({
        where: {
          ...mine,
          status: { notIn: [...CLOSED_TASK_STATUSES, 'BLOCKED'] },
          OR: [{ dueAt: null }, { dueAt: { gt: soon } }],
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: LIST_LIMIT,
        select: TASK_SELECT,
      }),
      readApprovals && decideApprovals
        ? this.prisma.approvalRequest.findMany({
            where: { tenantId, status: 'REQUESTED', NOT: { requestedByUserId: userId } },
            orderBy: [{ dueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
            take: LIST_LIMIT,
            select: { id: true, title: true, dueAt: true, createdAt: true },
          })
        : Promise.resolve([]),
      readApprovals
        ? this.prisma.approvalRequest.findMany({
            where: { tenantId, status: 'REQUESTED', requestedByUserId: userId },
            orderBy: { createdAt: 'desc' },
            take: LIST_LIMIT,
            select: { id: true, title: true, dueAt: true, createdAt: true },
          })
        : Promise.resolve([]),
      readFollowUps
        ? this.prisma.followUp.findMany({
            where: { tenantId, ownerUserId: userId, status: { in: ['OPEN', 'OVERDUE'] }, dueAt: { lte: soon } },
            orderBy: { dueAt: 'asc' },
            take: LIST_LIMIT,
            select: { id: true, title: true, status: true, dueAt: true },
          })
        : Promise.resolve([]),
      this.prisma.notification.count({ where: { tenantId, recipientUserId: userId, status: 'UNREAD' } }),
      this.prisma.notification.findMany({
        where: { tenantId, recipientUserId: userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, status: true, resourceType: true, resourceId: true, createdAt: true },
      }),
    ]);

    return {
      generatedAt: now.toISOString(),
      tasks: { overdue, dueSoon, blocked, open },
      approvals: { toDecide, requested },
      followUps,
      notifications: { unread, latest },
    };
  }
}
