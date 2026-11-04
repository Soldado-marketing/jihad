import { Injectable } from '@nestjs/common';
import { ApprovalStatus, MembershipRole, Prisma } from '@prisma/client';
import { NotificationsService } from '../../notifications/notifications.service';
import { appointmentWhen } from '../../appointments/appointment-format';
import { ScheduledJob } from '../scheduler.types';

const WINDOW_MS = 24 * 60 * 60 * 1000;
const PER_RUN_LIMIT = 200;

/**
 * Client review deadlines (plan row D03). A delivery can carry a review-by
 * time (`ApprovalRequest.dueAt`, set when staff send it). While the delivery
 * is still waiting for the client and its review-by time is within the next
 * 24 hours, the client members of that delivery's own scope are reminded
 * once; the dedupe key holds the time, so a delivery sent again with another
 * date is reminded again. Nothing goes to staff, and the text names only the
 * delivery and the time. After the time has passed nothing more is sent.
 */
@Injectable()
export class ClientReviewRemindersJob implements ScheduledJob {
  readonly name = 'client-review-reminders';
  readonly everyMs = 30 * 60 * 1000;
  readonly lockKey = 4;

  constructor(private readonly notifications: NotificationsService) {}

  async run(tx: Prisma.TransactionClient, now = new Date()): Promise<number> {
    const deliveries = await tx.approvalRequest.findMany({
      where: {
        tenant: { status: 'ACTIVE' },
        clientVisible: true,
        clientScopeKey: { not: null },
        fileAssetId: { not: null },
        status: ApprovalStatus.REQUESTED,
        dueAt: { gt: now, lte: new Date(now.getTime() + WINDOW_MS) },
      },
      orderBy: { dueAt: 'asc' },
      take: PER_RUN_LIMIT,
      select: { id: true, tenantId: true, title: true, dueAt: true, clientScopeKey: true },
    });
    let created = 0;
    for (const d of deliveries) {
      const clients = await tx.tenantMembership.findMany({
        where: { tenantId: d.tenantId, role: MembershipRole.CLIENT, status: 'ACTIVE', clientScopeKey: d.clientScopeKey },
        select: { userId: true },
      });
      if (!clients.length) continue;
      const dueAt = d.dueAt as Date;
      created += await this.notifications.notify({
        tenantId: d.tenantId,
        recipientUserIds: clients.map((c) => c.userId),
        audience: 'DIRECT',
        dedupeKey: `delivery.review_reminder:${d.id}:${dueAt.toISOString()}`,
        title: 'Reminder: a delivery is waiting for your review',
        body: `${d.title} · please review by ${appointmentWhen(dueAt)}`.slice(0, 240),
        resourceType: 'delivery',
        resourceId: d.id,
      });
    }
    return created;
  }
}
