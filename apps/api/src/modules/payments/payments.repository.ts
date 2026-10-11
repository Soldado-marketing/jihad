import { Injectable } from '@nestjs/common';
import { InvoiceStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { UNCOUNTED_PAYMENT_STATUSES } from '../invoices/invoice-totals';
import { PrismaService } from '../prisma/prisma.service';

/** Thrown when a payment would take an invoice above its total (D16). */
export class OverpaymentError extends Error {
  constructor(readonly remainingCents: number) {
    super('payment exceeds the remaining invoice balance');
  }
}

export interface CreatePaymentInput {
  invoiceId?: string;
  amountCents: number;
  currency: string;
  method?: PaymentMethod;
  status?: PaymentStatus;
  clientScopeKey?: string;
  receivedAt?: string;
}

/** Client-safe projection: no recordedByUserId, no internal scope key. */
const CLIENT_PAYMENT_SELECT = {
  id: true,
  amountCents: true,
  currency: true,
  method: true,
  status: true,
  receivedAt: true,
  invoice: { select: { id: true, invoiceNumber: true } },
} satisfies Prisma.PaymentSelect;

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.payment.findMany({
      where: { tenantId },
      orderBy: { receivedAt: 'desc' },
      select: {
        id: true, amountCents: true, currency: true, method: true, status: true,
        receivedAt: true, createdAt: true, recordedByUserId: true,
        invoice: { select: { id: true, invoiceNumber: true } },
      },
    });
  }

  /**
   * Client portal listing: only payments attached to an invoice the client is
   * allowed to see, and only inside the caller's own client scope. A payment
   * with no invoice is internal bookkeeping and is never shown.
   *
   * The scope is applied to the INVOICE, not to the payment row: the invoice is
   * what the client is entitled to, and a payment inherits that entitlement.
   * Filtering on the payment's own key would miss payments recorded without one.
   */
  listForClient(tenantId: string, clientScopeKey: string | null) {
    return this.prisma.payment.findMany({
      where: {
        tenantId,
        invoice: {
          is: {
            clientVisible: true,
            status: { not: InvoiceStatus.DRAFT },
            ...(clientScopeKey === null ? {} : { clientScopeKey }),
          },
        },
      },
      orderBy: { receivedAt: 'desc' },
      select: CLIENT_PAYMENT_SELECT,
    });
  }

  /** Confirms the invoice exists inside this tenant before a payment is attached. */
  findInvoiceForTenant(tenantId: string, invoiceId: string) {
    return this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      select: { id: true, currency: true, status: true, clientScopeKey: true },
    });
  }

  /**
   * Records a payment against an invoice without ever exceeding its total.
   *
   * The invoice row is locked (SELECT ... FOR UPDATE) for the transaction, so
   * concurrent payments on the same invoice are checked one after another:
   * two requests can never both see the same remaining balance and together
   * overpay it. Payments in an uncounted status (failed, refunded, cancelled)
   * do not reduce the balance and are not limited by it.
   */
  createWithinInvoiceBalance(tenantId: string, actorId: string, dto: CreatePaymentInput & { invoiceId: string }) {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ totalCents: number }[]>`
        SELECT "totalCents" FROM "Invoice"
        WHERE "id" = ${dto.invoiceId} AND "tenantId" = ${tenantId}
        FOR UPDATE`;
      const totalCents = Number(locked[0]?.totalCents ?? 0);

      const status = dto.status ?? PaymentStatus.RECORDED;
      const counts = !(UNCOUNTED_PAYMENT_STATUSES as readonly string[]).includes(status);
      if (counts) {
        const paid = await tx.payment.aggregate({
          where: { tenantId, invoiceId: dto.invoiceId, status: { notIn: [...UNCOUNTED_PAYMENT_STATUSES] } },
          _sum: { amountCents: true },
        });
        const remainingCents = Math.max(0, totalCents - (paid._sum.amountCents ?? 0));
        if (dto.amountCents > remainingCents) throw new OverpaymentError(remainingCents);
      }

      return tx.payment.create({ data: this.paymentData(tenantId, actorId, dto) });
    });
  }

  create(tenantId: string, actorId: string, dto: CreatePaymentInput) {
    return this.prisma.payment.create({ data: this.paymentData(tenantId, actorId, dto) });
  }

  private paymentData(tenantId: string, actorId: string, dto: CreatePaymentInput) {
    return {
      tenantId,
      invoiceId: dto.invoiceId,
      amountCents: dto.amountCents,
      currency: (dto.currency ?? 'EUR').toUpperCase(),
      method: dto.method ?? PaymentMethod.MANUAL,
      status: dto.status ?? PaymentStatus.RECORDED,
      clientScopeKey: dto.clientScopeKey,
      // A manual entry records money that has already arrived, so the default
      // is now rather than null.
      receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : new Date(),
      recordedByUserId: actorId,
    };
  }

  getById(tenantId: string, id: string) {
    return this.prisma.payment.findFirst({
      where: { id, tenantId },
      include: { invoice: { select: { id: true, invoiceNumber: true } } },
    });
  }
}
