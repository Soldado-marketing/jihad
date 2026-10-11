import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PermissionService } from '../permissions/permission.service';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { PrismaService } from '../prisma/prisma.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 62;
const PER_TYPE_LIMIT = 500;

export const CALENDAR_TYPES = ['task', 'meeting', 'followUp', 'approval', 'invoice'] as const;
export type CalendarType = (typeof CALENDAR_TYPES)[number];

const TYPE_PERMISSION: Record<CalendarType, PermissionResource> = {
  task: PermissionResource.TASK,
  meeting: PermissionResource.MEETING,
  followUp: PermissionResource.FOLLOW_UP,
  approval: PermissionResource.APPROVAL,
  invoice: PermissionResource.INVOICE,
};

export interface CalendarEvent {
  id: string;
  type: CalendarType;
  title: string;
  /** ISO timestamp the item is scheduled or due at. */
  at: string;
  status: string;
}

export interface CalendarCaller {
  sub: string;
  tenantId: string;
  role: string;
}

/**
 * Calendar aggregation (MAOS-T103, Blueprint §14): the calendar is a view,
 * not a storage system. It reads dated items from their own domains for a
 * bounded range. Each type appears only if the caller may read it; tasks
 * follow the contractor work scope; invoices show their number, never an
 * amount. A CLIENT is refused - the client portal has its own views.
 */
@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
    private readonly resourceScope: ResourceScopeService,
  ) {}

  async events(caller: CalendarCaller, fromRaw?: string, toRaw?: string, typesRaw?: string) {
    const from = new Date(fromRaw ?? '');
    const to = new Date(toRaw ?? '');
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
      throw new BadRequestException({ code: 'INVALID_RANGE', message: 'from and to must be ISO dates with from < to.' });
    }
    if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * DAY_MS) {
      throw new BadRequestException({ code: 'RANGE_TOO_LONG', message: `At most ${MAX_RANGE_DAYS} days per request.` });
    }
    const requested = typesRaw ? typesRaw.split(',').map((t) => t.trim()) : [...CALENDAR_TYPES];
    const unknown = requested.filter((t) => !(CALENDAR_TYPES as readonly string[]).includes(t));
    if (unknown.length) {
      throw new BadRequestException({ code: 'UNKNOWN_TYPE', message: `Unknown type: ${unknown.join(', ')}` });
    }

    const can = async (type: CalendarType) =>
      (await this.permissions.decide(
        { action: PermissionAction.READ, resource: TYPE_PERMISSION[type] },
        caller.sub,
        caller.tenantId,
        caller.role,
      )).allowed;

    if (!(await can('task'))) {
      throw new ForbiddenException({ code: 'FORBIDDEN', reason: 'calendar_internal_only' });
    }
    const allowed = new Set<CalendarType>();
    for (const t of requested as CalendarType[]) if (await can(t)) allowed.add(t);

    const { tenantId } = caller;
    const range = { gte: from, lt: to };
    const scope = await this.resourceScope.resolveWorkScope(tenantId, caller.sub);
    const none = Promise.resolve([] as CalendarEvent[]);

    const [tasks, meetings, followUps, approvals, invoices] = await Promise.all([
      allowed.has('task')
        ? this.prisma.task
            .findMany({
              where: { tenantId, dueAt: range, AND: [this.resourceScope.taskWhere(scope)] },
              take: PER_TYPE_LIMIT,
              select: { id: true, title: true, dueAt: true, status: true },
            })
            .then((rows) => rows.map((r) => this.event(r.id, 'task', r.title, r.dueAt, r.status)))
        : none,
      allowed.has('meeting')
        ? this.prisma.meeting
            .findMany({ where: { tenantId, scheduledAt: range }, take: PER_TYPE_LIMIT, select: { id: true, title: true, scheduledAt: true, status: true } })
            .then((rows) => rows.map((r) => this.event(r.id, 'meeting', r.title, r.scheduledAt, r.status)))
        : none,
      allowed.has('followUp')
        ? this.prisma.followUp
            .findMany({ where: { tenantId, dueAt: range }, take: PER_TYPE_LIMIT, select: { id: true, title: true, dueAt: true, status: true } })
            .then((rows) => rows.map((r) => this.event(r.id, 'followUp', r.title, r.dueAt, r.status)))
        : none,
      allowed.has('approval')
        ? this.prisma.approvalRequest
            .findMany({ where: { tenantId, dueAt: range }, take: PER_TYPE_LIMIT, select: { id: true, title: true, dueAt: true, status: true } })
            .then((rows) => rows.map((r) => this.event(r.id, 'approval', r.title, r.dueAt, r.status)))
        : none,
      allowed.has('invoice')
        ? this.prisma.invoice
            .findMany({
              where: { tenantId, dueAt: range, status: { not: 'VOID' } },
              take: PER_TYPE_LIMIT,
              select: { id: true, invoiceNumber: true, dueAt: true, status: true },
            })
            .then((rows) => rows.map((r) => this.event(r.id, 'invoice', `Invoice ${r.invoiceNumber} due`, r.dueAt, r.status)))
        : none,
    ]);

    const items = [...tasks, ...meetings, ...followUps, ...approvals, ...invoices].sort(
      (a, b) => a.at.localeCompare(b.at) || a.type.localeCompare(b.type),
    );
    return { from: from.toISOString(), to: to.toISOString(), types: [...allowed], items };
  }

  private event(id: string, type: CalendarType, title: string, at: Date | null, status: string): CalendarEvent {
    return { id, type, title, at: (at as Date).toISOString(), status };
  }
}
