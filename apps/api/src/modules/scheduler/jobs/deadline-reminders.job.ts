import { Injectable } from '@nestjs/common';
import { MembershipRole, Prisma } from '@prisma/client';
import { NotificationsService } from '../../notifications/notifications.service';
import { ScheduledJob } from '../scheduler.types';

const WINDOW_MS = 24 * 60 * 60 * 1000;
const PER_RUN_LIMIT = 200;

/**
 * Deadline and approval reminders (MAOS-T142).
 *
 * - An open task with an assignee, due within the next 24 hours, reminds its
 *   assignee once.
 * - A REQUESTED approval due within the next 24 hours reminds the OWNER and
 *   MANAGERs once (the audience of "approval requested"), not its requester.
 *
 * Every reminder goes through NotificationsService.notify, the single writer:
 * it re-checks each recipient's tenant membership, keeps INTERNAL reminders
 * away from CLIENT members, and is idempotent on the dedupe key. The key holds
 * the due date, so moving a deadline earns a fresh reminder, while re-runs
 * and other API instances never send a second one. Suspended tenants are
 * skipped; each run handles at most PER_RUN_LIMIT items per kind, soonest first.
 */
@Injectable()
export class DeadlineRemindersJob implements ScheduledJob {
  readonly name = 'deadline-reminders';
  readonly everyMs = 30 * 60 * 1000;
  readonly lockKey = 2;

  constructor(private readonly notifications: NotificationsService) {}

  async run(tx: Prisma.TransactionClient, now = new Date()): Promise<number> {
    const window = { gt: now, lte: new Date(now.getTime() + WINDOW_MS) };
    const activeTenant = { tenant: { status: 'ACTIVE' as const } };

    const tasks = await tx.task.findMany({
      where: { ...activeTenant, dueAt: window, assignedToUserId: { not: null }, status: { notIn: ['DONE', 'ARCHIVED'] } },
      orderBy: { dueAt: 'asc' },
      take: PER_RUN_LIMIT,
      select: { id: true, tenantId: true, title: true, dueAt: true, assignedToUserId: true },
    });
    const approvals = await tx.approvalRequest.findMany({
      where: { ...activeTenant, dueAt: window, status: 'REQUESTED' },
      orderBy: { dueAt: 'asc' },
      take: PER_RUN_LIMIT,
      select: { id: true, tenantId: true, title: true, dueAt: true, requestedByUserId: true },
    });

    let created = 0;
    for (const t of tasks) {
      created += await this.notifications.notify({
        tenantId: t.tenantId,
        recipientUserIds: [t.assignedToUserId as string],
        audience: 'INTERNAL',
        dedupeKey: `task.due-soon:${t.id}:${(t.dueAt as Date).toISOString()}`,
        title: 'Task due within 24 hours',
        body: t.title,
        resourceType: 'task',
        resourceId: t.id,
      });
    }
    for (const a of approvals) {
      created += await this.notifications.notify({
        tenantId: a.tenantId,
        recipientRoles: [MembershipRole.OWNER, MembershipRole.MANAGER],
        audience: 'INTERNAL',
        // The requester waits for the decision; the reminder is for deciders.
        actorUserId: a.requestedByUserId ?? undefined,
        dedupeKey: `approval.due-soon:${a.id}:${(a.dueAt as Date).toISOString()}`,
        title: 'Approval due within 24 hours',
        body: a.title,
        resourceType: 'approval',
        resourceId: a.id,
      });
    }
    return created;
  }
}
