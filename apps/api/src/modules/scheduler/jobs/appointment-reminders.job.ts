import { Injectable } from '@nestjs/common';
import { MembershipRole, Prisma } from '@prisma/client';
import { NotificationsService } from '../../notifications/notifications.service';
import { appointmentWhen, parseAppointmentDescription, SHOOTING_LABEL } from '../../appointments/appointment-format';
import { ScheduledJob } from '../scheduler.types';

const WINDOW_MS = 24 * 60 * 60 * 1000;
const PER_RUN_LIMIT = 200;

/**
 * Reminds the client of a shooting appointment starting within 24 hours, once
 * per start time (the dedupe key holds it, so a moved appointment is reminded
 * again). Only the client members of the appointment's own client scope.
 */
@Injectable()
export class AppointmentRemindersJob implements ScheduledJob {
  readonly name = 'appointment-reminders';
  readonly everyMs = 30 * 60 * 1000;
  readonly lockKey = 3;

  constructor(private readonly notifications: NotificationsService) {}

  async run(tx: Prisma.TransactionClient, now = new Date()): Promise<number> {
    const tasks = await tx.task.findMany({
      where: {
        tenant: { status: 'ACTIVE' }, clientVisible: true, clientScopeKey: { not: null },
        status: { notIn: ['DONE', 'ARCHIVED'] },
        dueAt: { gt: now, lte: new Date(now.getTime() + WINDOW_MS) },
        labels: { some: { label: { name: SHOOTING_LABEL } } },
      },
      orderBy: { dueAt: 'asc' },
      take: PER_RUN_LIMIT,
      select: { id: true, tenantId: true, title: true, description: true, dueAt: true, clientScopeKey: true },
    });
    let created = 0;
    for (const t of tasks) {
      const clients = await tx.tenantMembership.findMany({
        where: { tenantId: t.tenantId, role: MembershipRole.CLIENT, status: 'ACTIVE', clientScopeKey: t.clientScopeKey },
        select: { userId: true },
      });
      const { location } = parseAppointmentDescription(t.description);
      created += await this.notifications.notify({
        tenantId: t.tenantId,
        recipientUserIds: clients.map((c) => c.userId),
        audience: 'DIRECT',
        dedupeKey: `appointment.reminder:${t.id}:${(t.dueAt as Date).toISOString()}`,
        title: 'Reminder: shooting appointment tomorrow',
        body: `${t.title} · ${appointmentWhen(t.dueAt as Date)}${location ? ` · ${location}` : ''}`.slice(0, 240),
        resourceType: 'appointment',
        resourceId: t.id,
      });
    }
    return created;
  }
}
