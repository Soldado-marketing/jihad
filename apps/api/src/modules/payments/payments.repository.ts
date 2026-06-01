import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantAwareRepository } from '../../common/repositories/tenant-aware.repository';
import { TenantContext } from '../../common/tenant/tenant-context';
import { CreatePaymentDto } from './dto/create-payment.dto';

export type PaymentStatusValue =
  | 'PENDING'
  | 'RECORDED'
  | 'PARTIAL'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED'
  | 'CANCELED';

export type PaymentMethodValue = 'MANUAL' | 'BANK_TRANSFER' | 'CARD' | 'CASH' | 'OTHER';

export type PaymentRecordPlaceholder = {
  id: string;
  tenantId: string;
  invoiceId?: string;
  amountCents: number;
  currency: string;
  status: PaymentStatusValue;
  method: PaymentMethodValue;
  clientScopeKey?: string;
  externalPaymentProviderIntegrated: false;
  sourceType: 'sprint-9-placeholder';
};

@Injectable()
export class PaymentsRepository extends TenantAwareRepository {
  list(context: TenantContext): PaymentRecordPlaceholder[] {
    const tenant = this.requireTenantContext(context);

    return [this.placeholderPayment(tenant.tenantId)];
  }

  create(
    context: TenantContext,
    actor: ActorContext | undefined,
    dto: CreatePaymentDto,
  ): PaymentRecordPlaceholder {
    const tenant = this.requireTenantContext(context);

    return {
      amountCents: dto.amountCents,
      clientScopeKey: dto.clientScopeKey,
      currency: dto.currency,
      externalPaymentProviderIntegrated: false,
      id: randomUUID(),
      invoiceId: dto.invoiceId,
      method: dto.method ?? 'MANUAL',
      sourceType: 'sprint-9-placeholder',
      status: dto.status ?? 'RECORDED',
      tenantId: tenant.tenantId,
    };
  }

  listClientVisible(context: TenantContext): PaymentRecordPlaceholder[] {
    const tenant = this.requireTenantContext(context);

    return [this.placeholderPayment(tenant.tenantId)];
  }

  private placeholderPayment(tenantId: string): PaymentRecordPlaceholder {
    return {
      amountCents: 125000,
      clientScopeKey: 'client-scope-placeholder',
      currency: 'EUR',
      externalPaymentProviderIntegrated: false,
      id: 'sprint-9-payment-placeholder',
      invoiceId: 'sprint-9-invoice-placeholder',
      method: 'MANUAL',
      sourceType: 'sprint-9-placeholder',
      status: 'PARTIAL',
      tenantId,
    };
  }
}
