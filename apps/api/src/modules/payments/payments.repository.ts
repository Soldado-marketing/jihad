import { Injectable } from '@nestjs/common';
import { InvoiceStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
   * allowed to see. A payment with no invoice is internal bookkeeping and is
   * never shown.
   */
  listForClient(tenantId: string) {
    return this.prisma.payment.findMany({
      where: {
        tenantId,
        invoice: { is: { clientVisible: true, status: { not: InvoiceStatus.DRAFT } } },
      },
      orderBy: { receivedAt: 'desc' },
      select: CLIENT_PAYMENT_SELECT,
    });
  }

  /** Confirms the invoice exists inside this tenant before a payment is attached. */
  findInvoiceForTenant(tenantId: string, invoiceId: string) {
    return this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      select: { id: true, currency: true, status: true },
    });
  }

  create(tenantId: string, actorId: string, dto: CreatePaymentInput) {
    return this.prisma.payment.create({
      data: {
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
      },
    });
  }

  getById(tenantId: string, id: string) {
    return this.prisma.payment.findFirst({
      where: { id, tenantId },
      include: { invoice: { select: { id: true, invoiceNumber: true } } },
    });
  }
}
