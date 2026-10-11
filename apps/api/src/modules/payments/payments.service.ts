/**
 * Phase 4 - Manual payment recording.
 *
 * Recording a payment is the event that moves the money side of the system:
 * it re-derives the invoice's paidCents and status, and posts revenue once the
 * invoice is settled in full.
 */

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ClientScopeService } from '../memberships/client-scope.service';
import { InvoiceActor, InvoicesService } from '../invoices/invoices.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreatePaymentInput, OverpaymentError, PaymentsRepository } from './payments.repository';

/** Format of an Idempotency-Key: long enough to be unique per submit. */
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_.:-]{8,100}$/;

/** A replay must describe the same payment as the one recorded first. */
function samePayment(
  recorded: { invoiceId: string | null; amountCents: number; currency: string; method: string; status: string },
  input: CreatePaymentInput,
): boolean {
  return (
    recorded.invoiceId === (input.invoiceId ?? null) &&
    recorded.amountCents === input.amountCents &&
    recorded.currency === input.currency.toUpperCase() &&
    recorded.method === (input.method ?? 'MANUAL') &&
    recorded.status === (input.status ?? 'RECORDED')
  );
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly repo: PaymentsRepository,
    private readonly invoices: InvoicesService,
    private readonly clientScope: ClientScopeService,
  ) {}

  list(tenantId: string) { return this.repo.list(tenantId); }

  async listForClient(tenantId: string, actorId: string, role: string) {
    const scope = await this.clientScope.resolve(tenantId, actorId, role);
    return this.repo.listForClient(tenantId, scope);
  }

  async get(tenantId: string, id: string) {
    const payment = await this.repo.getById(tenantId, id);
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  /**
   * Records a payment and re-synchronises the invoice it belongs to.
   *
   * The invoice is looked up inside the tenant first: without that check a
   * caller could attach a payment to another tenant's invoice by id.
   *
   * `idempotencyKey` (the Idempotency-Key header, D16): a repeated submit with
   * the same key returns the payment recorded the first time instead of
   * recording it again; the same key with a different payment is refused.
   */
  async create(actor: InvoiceActor, dto: CreatePaymentDto, idempotencyKey?: string) {
    const { tenantId } = actor;

    if (idempotencyKey !== undefined && !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
      throw new BadRequestException({
        code: 'INVALID_IDEMPOTENCY_KEY',
        reason: 'Idempotency-Key must be 8-100 letters, digits, ".", "_", ":" or "-".',
      });
    }

    if (dto.amountCents <= 0) {
      throw new BadRequestException({
        code: 'INVALID_PAYMENT_AMOUNT',
        reason: 'amountCents must be greater than zero.',
      });
    }

    let input = dto as CreatePaymentInput;

    if (dto.invoiceId) {
      const invoice = await this.repo.findInvoiceForTenant(tenantId, dto.invoiceId);
      if (!invoice) throw new NotFoundException('Invoice not found');

      // A draft was never issued and a void invoice is cancelled: paying either
      // would turn a draft into PAID (and post revenue) or record money against
      // nothing payable.
      if (invoice.status === 'DRAFT' || invoice.status === 'VOID') {
        throw new ConflictException({
          code: 'INVOICE_NOT_PAYABLE',
          reason: `A payment cannot be recorded on a ${invoice.status} invoice.`,
        });
      }

      if (dto.currency.toUpperCase() !== invoice.currency.toUpperCase()) {
        throw new BadRequestException({
          code: 'CURRENCY_MISMATCH',
          reason: 'The payment currency must match the invoice currency.',
        });
      }

      // The payment belongs to the invoice's client. A different key would put
      // it in another client's portal, so it is refused rather than stored.
      if (dto.clientScopeKey !== undefined && dto.clientScopeKey !== invoice.clientScopeKey) {
        throw new BadRequestException({
          code: 'CLIENT_SCOPE_MISMATCH',
          reason: "clientScopeKey must match the invoice's client.",
        });
      }
      input = { ...input, clientScopeKey: invoice.clientScopeKey ?? undefined };
    }

    input = { ...input, idempotencyKey };
    const { payment, replayed } = dto.invoiceId
      ? await this.createWithinBalance(tenantId, actor.actorId, { ...input, invoiceId: dto.invoiceId })
      : await this.repo.create(tenantId, actor.actorId, input);

    if (replayed && !samePayment(payment, input)) {
      throw new ConflictException({
        code: 'IDEMPOTENCY_KEY_REUSED',
        reason: 'This Idempotency-Key was already used for a different payment.',
      });
    }

    const invoice = dto.invoiceId
      ? await this.invoices.syncAfterPayment(actor, dto.invoiceId)
      : null;

    return { invoice, payment, replayed };
  }

  /** D16: a payment may not take an invoice above its total (409 OVERPAYMENT). */
  private async createWithinBalance(
    tenantId: string,
    actorId: string,
    input: CreatePaymentInput & { invoiceId: string },
  ) {
    try {
      return await this.repo.createWithinInvoiceBalance(tenantId, actorId, input);
    } catch (error) {
      if (error instanceof OverpaymentError) {
        throw new ConflictException({
          code: 'OVERPAYMENT',
          reason: 'The payment exceeds the remaining invoice balance.',
          remainingCents: error.remainingCents,
        });
      }
      throw error;
    }
  }
}
