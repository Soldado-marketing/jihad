import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ProjectProfitability,
  buildProjectProfitability,
  computeProfitability,
} from './profitability';

@Injectable()
export class FinanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(tenantId: string) {
    const [revenue, costs, invoices, payments, invoiceCurrency] = await Promise.all([
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
    ]);

    const totalRevenueCents = revenue._sum.amountCents ?? 0;
    const totalCostCents = costs._sum.amountCents ?? 0;

    return {
      totalRevenueCents,
      totalCostCents,
      totalInvoicedCents: invoices._sum.totalCents ?? 0,
      totalPaidCents: invoices._sum.paidCents ?? payments._sum.amountCents ?? 0,
      currency: invoiceCurrency?.currency ?? 'EUR',
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
    const [revenueGroups, costGroups, currencyRow] = await Promise.all([
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
    ]);

    const projectIds = [
      ...new Set(
        [...revenueGroups, ...costGroups]
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

    return {
      currency: currencyRow?.currency ?? 'EUR',
      projects: buildProjectProfitability(revenueByProject, costByProject),
    };
  }
}
