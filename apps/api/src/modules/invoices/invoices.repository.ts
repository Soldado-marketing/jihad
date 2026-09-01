import { Injectable } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceStatusName, computeInvoiceTotals, resolveInvoiceStatus } from './invoice-totals';

/**
 * Client-safe projection.
 *
 * Deliberately narrower than the internal one: no createdByUserId, no
 * clientScopeKey, no internal timestamps beyond what a client needs to pay.
 */
const CLIENT_INVOICE_SELECT = {
  id: true,
  invoiceNumber: true,
  status: true,
  currency: true,
  subtotalCents: true,
  totalCents: true,
  paidCents: true,
  issuedAt: true,
  dueAt: true,
  project: { select: { id: true, name: true } },
} satisfies Prisma.InvoiceSelect;

/** A client must never see a draft or an invoice not marked client-visible. */
const CLIENT_VISIBLE_WHERE = {
  clientVisible: true,
  status: { not: InvoiceStatus.DRAFT },
} satisfies Prisma.InvoiceWhereInput;

@Injectable()
export class InvoicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.invoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, invoiceNumber: true, status: true, currency: true,
        subtotalCents: true, totalCents: true, paidCents: true,
        clientVisible: true,
        issuedAt: true, dueAt: true, createdAt: true, updatedAt: true,
        project: { select: { id: true, name: true } },
      },
    });
  }

  /** Client portal listing: client-visible, non-draft invoices only. */
  listForClient(tenantId: string) {
    return this.prisma.invoice.findMany({
      where: { tenantId, ...CLIENT_VISIBLE_WHERE },
      orderBy: { issuedAt: 'desc' },
      select: CLIENT_INVOICE_SELECT,
    });
  }

  /** Client portal detail. Returns null when the invoice is not client-visible. */
  getForClient(tenantId: string, id: string) {
    return this.prisma.invoice.findFirst({
      where: { id, tenantId, ...CLIENT_VISIBLE_WHERE },
      select: {
        ...CLIENT_INVOICE_SELECT,
        lines: {
          select: {
            id: true, description: true, quantity: true,
            unitAmountCents: true, totalAmountCents: true,
          },
        },
        payments: {
          select: { id: true, amountCents: true, receivedAt: true, method: true, status: true },
          orderBy: { receivedAt: 'desc' },
        },
      },
    });
  }

  /**
   * Creates the invoice and its lines atomically, with totals computed from the
   * lines rather than accepted from the caller.
   */
  create(tenantId: string, actorId: string, dto: CreateInvoiceDto) {
    const totals = computeInvoiceTotals(dto.lines ?? []);

    return this.prisma.invoice.create({
      data: {
        tenantId,
        invoiceNumber: dto.invoiceNumber,
        currency: (dto.currency ?? 'EUR').toUpperCase(),
        projectId: dto.projectId,
        clientScopeKey: dto.clientScopeKey,
        createdByUserId: actorId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        subtotalCents: totals.subtotalCents,
        totalCents: totals.totalCents,
        lines: {
          create: totals.lines.map((line) => ({
            tenantId,
            description: line.description,
            quantity: line.quantity,
            unitAmountCents: line.unitAmountCents,
            totalAmountCents: line.totalAmountCents,
          })),
        },
      },
      include: { lines: true },
    });
  }

  getById(tenantId: string, id: string) {
    return this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        lines: true,
        payments: { select: { id: true, amountCents: true, receivedAt: true, method: true, status: true } },
        project: { select: { id: true, name: true } },
      },
    });
  }

  /** Everything the PDF renderer needs, including the tenant's display name. */
  getForPdf(tenantId: string, id: string) {
    return this.prisma.invoice.findFirst({
      where: { id, tenantId },
      select: {
        id: true, invoiceNumber: true, status: true, currency: true,
        subtotalCents: true, totalCents: true, paidCents: true,
        issuedAt: true, dueAt: true, clientVisible: true, projectId: true,
        project: { select: { id: true, name: true } },
        tenant: { select: { name: true } },
        lines: {
          select: {
            description: true, quantity: true,
            unitAmountCents: true, totalAmountCents: true,
          },
        },
      },
    });
  }

  updateStatus(tenantId: string, id: string, status: InvoiceStatus) {
    return this.prisma.invoice.update({
      where: { id, tenantId },
      data: { status },
    });
  }

  /**
   * Marks an invoice as issued. issuedAt is stamped only once so a re-send does
   * not rewrite the original issue date.
   */
  markSent(tenantId: string, id: string, issuedAt: Date) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.invoice.findFirst({
        where: { id, tenantId },
        select: { issuedAt: true, status: true },
      });

      return tx.invoice.update({
        where: { id, tenantId },
        data: {
          clientVisible: true,
          issuedAt: current?.issuedAt ?? issuedAt,
          status:
            current?.status === InvoiceStatus.DRAFT ? InvoiceStatus.SENT : current?.status,
        },
      });
    });
  }

  /**
   * Recomputes paidCents from the payments actually recorded, then re-derives
   * the status. Deriving from the payment rows (rather than incrementing a
   * counter) keeps the invoice correct even if a payment is added out of band.
   */
  recalculatePaid(tenantId: string, invoiceId: string, now = new Date()) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id: invoiceId, tenantId },
        select: { id: true, status: true, totalCents: true, dueAt: true },
      });
      if (!invoice) return null;

      const paid = await tx.payment.aggregate({
        where: { tenantId, invoiceId, status: { notIn: ['FAILED', 'REFUNDED', 'CANCELED'] } },
        _sum: { amountCents: true },
      });

      const paidCents = paid._sum.amountCents ?? 0;
      const status = resolveInvoiceStatus({
        currentStatus: invoice.status as InvoiceStatusName,
        dueAt: invoice.dueAt,
        now,
        paidCents,
        totalCents: invoice.totalCents,
      });

      return tx.invoice.update({
        where: { id: invoiceId, tenantId },
        data: { paidCents, status: status as InvoiceStatus },
        select: {
          id: true, invoiceNumber: true, status: true, currency: true,
          totalCents: true, paidCents: true, projectId: true, clientScopeKey: true,
        },
      });
    });
  }

  /**
   * Posts invoice revenue exactly once.
   *
   * Idempotency matters here: a second payment on an already-paid invoice must
   * not double-count revenue, so an existing record for the invoice wins.
   */
  async postRevenueOnce(params: {
    tenantId: string;
    invoiceId: string;
    projectId: string | null;
    clientScopeKey: string | null;
    amountCents: number;
    currency: string;
    actorId?: string;
  }): Promise<{ created: boolean }> {
    const existing = await this.prisma.revenueRecord.findFirst({
      where: { tenantId: params.tenantId, invoiceId: params.invoiceId },
      select: { id: true },
    });
    if (existing) return { created: false };

    await this.prisma.revenueRecord.create({
      data: {
        tenantId: params.tenantId,
        sourceType: 'invoice',
        amountCents: params.amountCents,
        currency: params.currency,
        invoiceId: params.invoiceId,
        projectId: params.projectId ?? undefined,
        clientScopeKey: params.clientScopeKey ?? undefined,
        createdByUserId: params.actorId,
      },
    });

    return { created: true };
  }

  /** Client recipients of a project, used to address the invoice email. */
  findProjectClientEmails(tenantId: string, projectId: string): Promise<{ email: string }[]> {
    return this.prisma.user.findMany({
      where: {
        memberships: { some: { tenantId, role: 'CLIENT' } },
        projectMemberships: { some: { tenantId, projectId } },
      },
      select: { email: true },
    });
  }
}
