import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PermissionService } from '../permissions/permission.service';
import { PermissionAction, PermissionRequirement, PermissionResource } from '../permissions/permission.types';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { progressFrom } from '../projects/projects.service';
import { CustomersService } from './customers.service';

export const OVERVIEW_SECTIONS = ['projects', 'tasks', 'files', 'approvals', 'invoices', 'finance'] as const;
export type OverviewSection = (typeof OVERVIEW_SECTIONS)[number];

const SECTION_PERMISSION: Record<OverviewSection, PermissionRequirement> = {
  projects: { action: PermissionAction.READ, resource: PermissionResource.PROJECT },
  tasks: { action: PermissionAction.READ, resource: PermissionResource.TASK },
  files: { action: PermissionAction.READ, resource: PermissionResource.FILE },
  approvals: { action: PermissionAction.READ, resource: PermissionResource.APPROVAL },
  // Invoice list without amounts: whoever may read invoices.
  invoices: { action: PermissionAction.READ, resource: PermissionResource.INVOICE },
  // Amounts, totals and payments: sensitive finance, OWNER only (Blueprint §6.2, §6.8).
  finance: { action: PermissionAction.READ, resource: PermissionResource.FINANCE, sensitive: true },
};

export const LIST_LIMIT = 10;
export const PROJECT_LIMIT = 50;
const OPEN_TASK: Prisma.TaskWhereInput = { status: { notIn: ['DONE', 'ARCHIVED'] } };
const OPEN_APPROVAL: Prisma.ApprovalRequestWhereInput = { status: { in: ['REQUESTED', 'CHANGES_REQUESTED'] } };
// Draft and void invoices are not money owed.
const BILLED_INVOICE: Prisma.InvoiceWhereInput = { status: { notIn: ['DRAFT', 'VOID'] } };

export interface OverviewCaller {
  sub: string;
  tenantId: string;
  role: string;
}

const counts = (rows: ReadonlyArray<{ status: string; _count: { _all: number } }>) =>
  Object.fromEntries(rows.map((r) => [r.status, r._count._all]));

/**
 * Customer 360 (MAOS-T54; Blueprint §43.2 "Customer 360"). One read that
 * gathers a customer's projects, tasks, files, approvals and invoices.
 *
 * - The customer itself needs CUSTOMER read (controller); a foreign id is 404.
 * - Each section is included only when the caller's live permissions allow
 *   reading that resource, with the same contractor work scope as the list
 *   endpoints. A section the caller may not read is absent, not empty.
 * - Money (budgets, invoice amounts, totals, payments) only for callers who
 *   pass the sensitive FINANCE check, i.e. the OWNER. Invoices are listed
 *   without amounts for everyone else who may read invoices.
 * - Records belong to the customer through their derived `customerId`
 *   (ADR-017): projects, files and invoices directly; tasks through their
 *   project; approvals through their file or the customer's client key;
 *   payments through their invoice. Meetings are not linked to customers in
 *   the schema, so they are not part of this overview.
 * - Lists are bounded; the counts cover everything in scope.
 */
@Injectable()
export class CustomerOverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
    private readonly resourceScope: ResourceScopeService,
    private readonly customers: CustomersService,
  ) {}

  async overview(caller: OverviewCaller, id: string) {
    const { tenantId } = caller;
    const customer = await this.customers.get(tenantId, id);

    const sections: OverviewSection[] = [];
    for (const s of OVERVIEW_SECTIONS) {
      if ((await this.permissions.decide(SECTION_PERMISSION[s], caller.sub, tenantId, caller.role)).allowed) sections.push(s);
    }
    const has = (s: OverviewSection) => sections.includes(s);
    const money = has('finance');
    const scope = await this.resourceScope.resolveWorkScope(tenantId, caller.sub);
    const taskScope = this.resourceScope.taskWhere(scope);
    const fileScope = this.resourceScope.fileWhere(scope);

    const [projects, tasks, files, approvals, invoices, finance] = await Promise.all([
      has('projects') ? this.projects(tenantId, id, this.resourceScope.projectWhere(scope), taskScope, money) : undefined,
      has('tasks') ? this.tasks(tenantId, id, taskScope) : undefined,
      has('files') ? this.files(tenantId, id, fileScope) : undefined,
      has('approvals') ? this.approvals(tenantId, id, customer.clientScopeKey, scope ? fileScope : undefined) : undefined,
      has('invoices') ? this.invoices(tenantId, id) : undefined,
      money ? this.finance(tenantId, id) : undefined,
    ]);
    return { customer, sections, projects, tasks, files, approvals, invoices, finance };
  }

  private async projects(tenantId: string, customerId: string, projectScope: Prisma.ProjectWhereInput, taskScope: Prisma.TaskWhereInput, money: boolean) {
    const where: Prisma.ProjectWhereInput = { tenantId, customerId, AND: [projectScope] };
    const [total, rows] = await Promise.all([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: PROJECT_LIMIT,
        select: {
          id: true,
          name: true,
          status: true,
          projectNumber: true,
          serviceType: true,
          deadline: true,
          budgetCents: money,
          owner: { select: { id: true, displayName: true } },
        },
      }),
    ]);
    const statusRows = rows.length
      ? await this.prisma.task.groupBy({
          by: ['projectId', 'status'],
          where: { tenantId, projectId: { in: rows.map((r) => r.id) }, AND: [taskScope] },
          _count: { _all: true },
        })
      : [];
    const items = rows.map((p) => ({
      ...p,
      progress: progressFrom(statusRows.filter((r) => r.projectId === p.id).map((r) => ({ status: r.status, count: r._count._all }))),
    }));
    return { total, items };
  }

  private async tasks(tenantId: string, customerId: string, taskScope: Prisma.TaskWhereInput) {
    const where: Prisma.TaskWhereInput = { tenantId, project: { customerId }, AND: [taskScope] };
    const [byStatus, upcoming] = await Promise.all([
      this.prisma.task.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.task.findMany({
        where: { ...where, ...OPEN_TASK, dueAt: { not: null } },
        orderBy: { dueAt: 'asc' },
        take: LIST_LIMIT,
        select: { id: true, title: true, status: true, dueAt: true, projectId: true, assignedTo: { select: { id: true, displayName: true } } },
      }),
    ]);
    return { byStatus: counts(byStatus), upcoming };
  }

  private async files(tenantId: string, customerId: string, fileScope: Prisma.FileAssetWhereInput) {
    const where: Prisma.FileAssetWhereInput = { tenantId, customerId, AND: [fileScope] };
    const [total, recent] = await Promise.all([
      this.prisma.fileAsset.count({ where }),
      this.prisma.fileAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: LIST_LIMIT,
        select: { id: true, name: true, mimeType: true, sizeBytes: true, projectId: true, createdAt: true },
      }),
    ]);
    return { total, recent };
  }

  private async approvals(tenantId: string, customerId: string, clientScopeKey: string, fileScope?: Prisma.FileAssetWhereInput) {
    const where: Prisma.ApprovalRequestWhereInput = {
      tenantId,
      OR: [{ fileAsset: { customerId } }, { clientScopeKey }],
      // A scoped caller (contractor) sees only approvals on files in its scope.
      ...(fileScope && { fileAsset: fileScope }),
    };
    const [byStatus, open] = await Promise.all([
      this.prisma.approvalRequest.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.approvalRequest.findMany({
        where: { ...where, ...OPEN_APPROVAL },
        orderBy: { createdAt: 'desc' },
        take: LIST_LIMIT,
        select: { id: true, title: true, status: true, dueAt: true, fileAssetId: true },
      }),
    ]);
    return { byStatus: counts(byStatus), open };
  }

  /** No amounts here: this section is not finance-gated. */
  private async invoices(tenantId: string, customerId: string) {
    const where: Prisma.InvoiceWhereInput = { tenantId, customerId };
    const [byStatus, recent] = await Promise.all([
      this.prisma.invoice.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: LIST_LIMIT,
        select: { id: true, invoiceNumber: true, status: true, issuedAt: true, dueAt: true, projectId: true },
      }),
    ]);
    return { byStatus: counts(byStatus), recent };
  }

  /** OWNER only. Integer cents per currency; never mixed across currencies. */
  private async finance(tenantId: string, customerId: string) {
    const [sums, payments] = await Promise.all([
      this.prisma.invoice.groupBy({
        by: ['currency'],
        where: { tenantId, customerId, ...BILLED_INVOICE },
        _sum: { totalCents: true, paidCents: true },
      }),
      this.prisma.payment.findMany({
        where: { tenantId, invoice: { tenantId, customerId } },
        orderBy: { createdAt: 'desc' },
        take: LIST_LIMIT,
        select: { id: true, invoiceId: true, amountCents: true, currency: true, status: true, method: true, receivedAt: true },
      }),
    ]);
    const totals = sums.map((s) => {
      const invoicedCents = s._sum.totalCents ?? 0;
      const paidCents = s._sum.paidCents ?? 0;
      return { currency: s.currency, invoicedCents, paidCents, outstandingCents: invoicedCents - paidCents };
    });
    return { totals, recentPayments: payments };
  }
}
