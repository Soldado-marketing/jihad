import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { summariseLabour } from './labour-cost';
import {
  CustomerPart,
  CustomerProfitability,
  ProjectLabour,
  ProjectProfitability,
  buildCustomerProfitability,
  buildProjectProfitability,
  computeProfitability,
} from './profitability';

@Injectable()
export class FinanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(tenantId: string) {
    const [revenue, costs, invoices, payments, invoiceCurrency, labour] = await Promise.all([
      this.prisma.revenueRecord.aggregate({
        where: { tenantId },
        _sum: { amountCents: true },
        _count: true,
      }),
      this.prisma.costRecord.aggregate({
        where: { tenantId },
        _sum: { amountCents: true },
        _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: { tenantId },
        _sum: { totalCents: true, paidCents: true },
        _count: true,
      }),
      this.prisma.payment.aggregate({
        where: { tenantId },
        _sum: { amountCents: true },
        _count: true,
      }),
      this.prisma.invoice.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        select: { currency: true },
      }),
      this.labourGroups(tenantId),
    ]);

    const totalRevenueCents = revenue._sum.amountCents ?? 0;
    const recordedCostCents = costs._sum.amountCents ?? 0;
    // T74 (ADR-018 §6): labour from the costs stored on time entries, never re-rated.
    const labourTotal = summariseLabour(labour.map((g) => ({ minutes: g._sum.minutes ?? 0, costCents: g._sum.costCents })));
    const totalCostCents = recordedCostCents + labourTotal.costCents;

    return {
      totalRevenueCents,
      totalCostCents,
      totalInvoicedCents: invoices._sum.totalCents ?? 0,
      totalPaidCents: invoices._sum.paidCents ?? payments._sum.amountCents ?? 0,
      currency: invoiceCurrency?.currency ?? 'EUR',
      recordedCostCents,
      labourCostCents: labourTotal.costCents,
      ratedMinutes: labourTotal.ratedMinutes,
      unratedMinutes: labourTotal.unratedMinutes,
      // Some minutes have no rate: total cost is a lower bound, margin an upper bound.
      incomplete: labourTotal.incomplete,
      // Phase 4: margin is derived here so the summary and the per-project
      // report cannot disagree about how profitability is calculated.
      ...(({ marginCents, marginPercent }) => ({ marginCents, marginPercent }))(
        computeProfitability({ costCents: totalCostCents, revenueCents: totalRevenueCents }),
      ),
    };
  }

  listRevenue(tenantId: string) {
    return this.prisma.revenueRecord.findMany({
      where: { tenantId },
      orderBy: { recordedAt: 'desc' },
      take: 50,
    });
  }

  listCosts(tenantId: string) {
    return this.prisma.costRecord.findMany({
      where: { tenantId },
      orderBy: { recordedAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Phase 4 - profitability per project.
   *
   * Revenue and cost are grouped separately and then joined in memory, so a
   * project that has only costs still shows up (with a negative margin) rather
   * than disappearing from the report.
   */
  async getProfitability(tenantId: string): Promise<{
    currency: string;
    projects: ProjectProfitability[];
  }> {
    const [revenueGroups, costGroups, currencyRow, labourGroups] = await Promise.all([
      this.prisma.revenueRecord.groupBy({
        by: ['projectId'],
        where: { tenantId },
        _sum: { amountCents: true },
      }),
      this.prisma.costRecord.groupBy({
        by: ['projectId'],
        where: { tenantId },
        _sum: { amountCents: true },
      }),
      this.prisma.invoice.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        select: { currency: true },
      }),
      this.labourGroups(tenantId),
    ]);

    const projectIds = [
      ...new Set(
        [...revenueGroups, ...costGroups, ...labourGroups]
          .map((row) => row.projectId)
          .filter((id): id is string => typeof id === 'string'),
      ),
    ];

    const projects = projectIds.length
      ? await this.prisma.project.findMany({
          where: { tenantId, id: { in: projectIds } },
          select: { id: true, name: true },
        })
      : [];

    const nameById = new Map(projects.map((project) => [project.id, project.name]));

    const revenueByProject = new Map(
      revenueGroups.map((row) => [
        row.projectId,
        { name: row.projectId ? nameById.get(row.projectId) ?? null : null, cents: row._sum.amountCents ?? 0 },
      ]),
    );
    const costByProject = new Map(
      costGroups.map((row) => [
        row.projectId,
        { name: row.projectId ? nameById.get(row.projectId) ?? null : null, cents: row._sum.amountCents ?? 0 },
      ]),
    );

    // One rated and one unrated group per project at most; summariseLabour applies the ADR-018 rule.
    const entriesByProject = new Map<string, { minutes: number; costCents: number | null }[]>();
    for (const g of labourGroups) {
      const list = entriesByProject.get(g.projectId) ?? [];
      list.push({ minutes: g._sum.minutes ?? 0, costCents: g._sum.costCents });
      entriesByProject.set(g.projectId, list);
    }
    const labourByProject = new Map<string | null, ProjectLabour>(
      [...entriesByProject].map(([projectId, entries]) => {
        const l = summariseLabour(entries);
        return [projectId, { name: nameById.get(projectId) ?? null, costCents: l.costCents, ratedMinutes: l.ratedMinutes, unratedMinutes: l.unratedMinutes }];
      }),
    );

    return {
      currency: currencyRow?.currency ?? 'EUR',
      projects: buildProjectProfitability(revenueByProject, costByProject, labourByProject),
    };
  }

  /**
   * Customer profitability (MAOS-T75). Attribution, all within the tenant:
   * - revenue: the customer of the record's own client key (the invoice's
   *   customer, ADR-017), otherwise the customer of its project;
   * - recorded costs and stored labour: the customer of their project;
   * - anything without a customer stays in the row with customerId null.
   * Labour uses the costs stored on the entries (never current rates), every
   * stored entry counts (owner decision 2026-10-16), unrated minutes apart.
   */
  async getCustomerProfitability(tenantId: string): Promise<{ currency: string; customers: CustomerProfitability[] }> {
    const [revenueGroups, costGroups, labourGroups, currencyRow] = await Promise.all([
      this.prisma.revenueRecord.groupBy({ by: ['projectId', 'clientScopeKey'], where: { tenantId }, _sum: { amountCents: true } }),
      this.prisma.costRecord.groupBy({ by: ['projectId'], where: { tenantId }, _sum: { amountCents: true } }),
      this.labourGroups(tenantId),
      this.prisma.invoice.findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' }, select: { currency: true } }),
    ]);
    const projectIds = [...new Set([...revenueGroups, ...costGroups, ...labourGroups].map((g) => g.projectId).filter((id): id is string => typeof id === 'string'))];
    const keys = [...new Set(revenueGroups.map((g) => g.clientScopeKey).filter((k): k is string => typeof k === 'string'))];
    const [projects, keyed] = await Promise.all([
      projectIds.length
        ? this.prisma.project.findMany({ where: { tenantId, id: { in: projectIds } }, select: { id: true, customer: { select: { id: true, name: true } } } })
        : [],
      keys.length ? this.prisma.customer.findMany({ where: { tenantId, clientScopeKey: { in: keys } }, select: { id: true, name: true, clientScopeKey: true } }) : [],
    ]);
    const customerOfProject = new Map(projects.map((p) => [p.id, p.customer]));
    const customerOfKey = new Map(keyed.map((c) => [c.clientScopeKey, { id: c.id, name: c.name }]));
    const of = (c: { id: string; name: string } | null | undefined) => ({ customerId: c?.id ?? null, customerName: c?.name ?? null });

    const parts: CustomerPart[] = [
      ...revenueGroups.map((g) => ({
        ...of((g.clientScopeKey ? customerOfKey.get(g.clientScopeKey) : undefined) ?? (g.projectId ? customerOfProject.get(g.projectId) : null)),
        revenueCents: g._sum.amountCents ?? 0,
      })),
      ...costGroups.map((g) => ({ ...of(g.projectId ? customerOfProject.get(g.projectId) : null), recordedCostCents: g._sum.amountCents ?? 0 })),
      ...labourGroups.map((g) => {
        const l = summariseLabour([{ minutes: g._sum.minutes ?? 0, costCents: g._sum.costCents }]);
        return { ...of(customerOfProject.get(g.projectId)), labourCostCents: l.costCents, ratedMinutes: l.ratedMinutes, unratedMinutes: l.unratedMinutes };
      }),
    ];
    return { currency: currencyRow?.currency ?? 'EUR', customers: buildCustomerProfitability(parts) };
  }

  /**
   * Stored labour per project (T74): rated entries summed by their FROZEN
   * costCents, unrated entries (costCents null) counted by minutes only.
   * Every entry counts, billable or not (ADR-018 §6, owner decision
   * 2026-10-13: non-billable time is real cost). The Rate table is not read.
   */
  private labourGroups(tenantId: string) {
    return this.prisma.timeEntry.groupBy({
      by: ['projectId', 'rateSource'],
      where: { tenantId },
      _sum: { minutes: true, costCents: true },
    });
  }
}
