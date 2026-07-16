import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

    return {
      totalRevenueCents: revenue._sum.amountCents ?? 0,
      totalCostCents: costs._sum.amountCents ?? 0,
      totalInvoicedCents: invoices._sum.totalCents ?? 0,
      totalPaidCents: invoices._sum.paidCents ?? payments._sum.amountCents ?? 0,
      currency: invoiceCurrency?.currency ?? 'EUR',
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
}
