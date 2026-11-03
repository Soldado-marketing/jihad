import { Prisma, TaskStatus } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Open work: what still needs someone. BLOCKED is counted on its own. */
export const OPEN_TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW'];
/** Invoices that are issued and not settled. */
const OPEN_INVOICE_STATUSES = ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] as const;
/** Rows per list per company; the overview never loads whole tables. */
export const LIST_LIMIT = 5;

const person = { select: { id: true, displayName: true, email: true } } as const;
const projectRef = { select: { id: true, name: true } } as const;

/**
 * Read-only queries for the Owner Control Center. Every query takes the
 * tenantId of one company the caller already authorized; nothing here reads
 * across tenants on its own.
 */
@Injectable()
export class ControlCenterRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** ACTIVE OWNER memberships of the user in ACTIVE companies. */
  ownerMemberships(userId: string) {
    return this.prisma.tenantMembership.findMany({
      where: { userId, role: 'OWNER', status: 'ACTIVE', tenant: { status: 'ACTIVE' } },
      select: { tenant: { select: { id: true, name: true, slug: true } } },
      orderBy: { tenant: { name: 'asc' } },
    });
  }

  async companyWork(tenantId: string, now: Date) {
    const overdue: Prisma.TaskWhereInput = { tenantId, status: { in: OPEN_TASK_STATUSES }, dueAt: { lt: now } };
    const [
      activeProjects, overdueTasks, blockedTasks, inReviewTasks, unassignedOpen, assignedOpen,
      approvalsInternal, approvalsClient, overdueByAssignee,
    ] = await Promise.all([
      this.prisma.project.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.task.count({ where: { ...overdue, tenantId } }),
      this.prisma.task.count({ where: { tenantId, status: 'BLOCKED' } }),
      this.prisma.task.count({ where: { tenantId, status: 'IN_REVIEW' } }),
      this.prisma.task.count({ where: { tenantId, status: { in: OPEN_TASK_STATUSES }, assignedToUserId: null } }),
      this.prisma.task.count({ where: { tenantId, status: { in: ['TODO', 'IN_PROGRESS'] }, assignedToUserId: { not: null } } }),
      this.prisma.approvalRequest.count({ where: { tenantId, status: 'REQUESTED', clientVisible: false } }),
      this.prisma.approvalRequest.count({ where: { tenantId, status: 'REQUESTED', clientVisible: true } }),
      this.prisma.task.groupBy({
        by: ['assignedToUserId'],
        where: { ...overdue, tenantId, assignedToUserId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { assignedToUserId: 'desc' } },
        take: 3,
      }),
    ]);
    return {
      counts: {
        activeProjects, overdueTasks, blockedTasks, inReviewTasks, unassignedOpen, assignedOpen,
        approvalsInternal, approvalsClient,
      },
      overdueByAssignee: overdueByAssignee.map((r) => ({ userId: r.assignedToUserId as string, overdue: r._count._all })),
    };
  }

  attention(tenantId: string, now: Date) {
    return Promise.all([
      this.prisma.approvalRequest.findMany({
        where: { tenantId, status: 'REQUESTED', clientVisible: false },
        select: { id: true, title: true, dueAt: true, createdAt: true, requestedByUserId: true },
        orderBy: { createdAt: 'asc' },
        take: LIST_LIMIT,
      }),
      this.prisma.task.findMany({
        where: { tenantId, status: 'BLOCKED' },
        select: { id: true, title: true, dueAt: true, updatedAt: true, assignedTo: person, project: projectRef },
        orderBy: { updatedAt: 'asc' },
        take: LIST_LIMIT,
      }),
      this.prisma.task.findMany({
        where: { tenantId, status: { in: OPEN_TASK_STATUSES }, dueAt: { lt: now } },
        select: { id: true, title: true, dueAt: true, status: true, assignedTo: person, project: projectRef },
        orderBy: { dueAt: 'asc' },
        take: LIST_LIMIT,
      }),
    ]);
  }

  /** Projects with overdue or blocked tasks, or a deadline before `soon`. */
  async projectsNeedingAttention(tenantId: string, now: Date, soon: Date) {
    const [overdue, blocked, nearDeadline] = await Promise.all([
      this.prisma.task.groupBy({
        by: ['projectId'],
        where: { tenantId, projectId: { not: null }, status: { in: OPEN_TASK_STATUSES }, dueAt: { lt: now } },
        _count: { _all: true },
      }),
      this.prisma.task.groupBy({
        by: ['projectId'],
        where: { tenantId, projectId: { not: null }, status: 'BLOCKED' },
        _count: { _all: true },
      }),
      this.prisma.project.findMany({
        where: { tenantId, status: 'ACTIVE', deadline: { lt: soon } },
        select: { id: true },
        orderBy: { deadline: 'asc' },
        take: LIST_LIMIT,
      }),
    ]);
    const ids = new Set<string>([
      ...overdue.map((r) => r.projectId as string),
      ...blocked.map((r) => r.projectId as string),
      ...nearDeadline.map((p) => p.id),
    ]);
    if (!ids.size) return [];
    const projects = await this.prisma.project.findMany({
      where: { tenantId, id: { in: [...ids] }, status: { not: 'ARCHIVED' } },
      select: { id: true, name: true, status: true, deadline: true, owner: person },
    });
    const count = (rows: { projectId: string | null; _count: { _all: number } }[], id: string) =>
      rows.find((r) => r.projectId === id)?._count._all ?? 0;
    return projects.map((p) => ({ ...p, overdueTasks: count(overdue, p.id), blockedTasks: count(blocked, p.id) }));
  }

  /** Issued, unsettled invoices per currency. Amounts stay in cents and are never mixed across currencies. */
  async finance(tenantId: string, now: Date) {
    const open: Prisma.InvoiceWhereInput = { tenantId, status: { in: [...OPEN_INVOICE_STATUSES] } };
    const overdue: Prisma.InvoiceWhereInput = { ...open, OR: [{ status: 'OVERDUE' }, { dueAt: { lt: now } }] };
    const sums = { _sum: { totalCents: true, paidCents: true }, _count: { _all: true } } as const;
    const [outstanding, overdueSums, overdueList, drafts] = await Promise.all([
      this.prisma.invoice.groupBy({ by: ['currency'], where: { ...open, tenantId }, ...sums }),
      this.prisma.invoice.groupBy({ by: ['currency'], where: { ...overdue, tenantId }, ...sums }),
      this.prisma.invoice.findMany({
        where: { ...overdue, tenantId },
        select: {
          id: true, invoiceNumber: true, currency: true, totalCents: true, paidCents: true, dueAt: true, status: true,
          customer: { select: { id: true, name: true } },
        },
        orderBy: { dueAt: 'asc' },
        take: LIST_LIMIT,
      }),
      this.prisma.invoice.count({ where: { tenantId, status: 'DRAFT' } }),
    ]);
    const byCurrency = (rows: typeof outstanding) => rows.map((r) => ({
      currency: r.currency,
      openCents: (r._sum.totalCents ?? 0) - (r._sum.paidCents ?? 0),
      invoices: r._count._all,
    }));
    return { outstanding: byCurrency(outstanding), overdue: byCurrency(overdueSums), overdueList, drafts };
  }

  recentActivity(tenantId: string, since: Date) {
    return Promise.all([
      this.prisma.task.findMany({
        where: { tenantId, status: 'DONE', updatedAt: { gte: since } },
        select: { id: true, title: true, updatedAt: true, assignedTo: person },
        orderBy: { updatedAt: 'desc' },
        take: LIST_LIMIT,
      }),
      this.prisma.approvalDecision.findMany({
        where: { tenantId, createdAt: { gte: since } },
        select: { id: true, decision: true, createdAt: true, approvalRequest: { select: { id: true, title: true } } },
        orderBy: { createdAt: 'desc' },
        take: LIST_LIMIT,
      }),
      this.prisma.approvalRequest.findMany({
        where: { tenantId, createdAt: { gte: since } },
        select: { id: true, title: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: LIST_LIMIT,
      }),
    ]);
  }

  /** Display names for user ids, limited to members of this company. */
  people(tenantId: string, ids: string[]) {
    if (!ids.length) return Promise.resolve([]);
    return this.prisma.user.findMany({
      where: { id: { in: ids }, memberships: { some: { tenantId } } },
      select: { id: true, displayName: true, email: true },
    });
  }
}
