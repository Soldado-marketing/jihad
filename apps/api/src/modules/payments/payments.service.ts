/**
 * Phase 4 - Manual payment recording.
 *
 * Recording a payment is the event that moves the money side of the system:
 * it re-derives the invoice's paidCents and status, and posts revenue once the
 * invoice is settled in full.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ClientScopeService } from '../memberships/client-scope.service';
import { InvoiceActor, InvoicesService } from '../invoices/invoices.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreatePaymentInput, PaymentsRepository } from './payments.repository';

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
   */
  async create(actor: InvoiceActor, dto: CreatePaymentDto) {
    const { tenantId } = actor;

    if (dto.amountCents <= 0) {
      throw new BadRequestException({
        code: 'INVALID_PAYMENT_AMOUNT',
        reason: 'amountCents must be greater than zero.',
      });
    }

    if (dto.invoiceId) {
      const invoice = await this.repo.findInvoiceForTenant(tenantId, dto.invoiceId);
      if (!invoice) throw new NotFoundException('Invoice not found');
    }

    const payment = await this.repo.create(tenantId, actor.actorId, dto as CreatePaymentInput);

    const invoice = dto.invoiceId
      ? await this.invoices.syncAfterPayment(actor, dto.invoiceId)
      : null;

    return { invoice, payment };
  }
}
