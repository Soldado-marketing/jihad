import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantAwareRepository } from '../../common/repositories/tenant-aware.repository';
import { TenantContext } from '../../common/tenant/tenant-context';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

export type InvoiceStatusValue =
  | 'DRAFT'
  | 'SENT'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'VOID';

export type InvoiceRecordPlaceholder = {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  status: InvoiceStatusValue;
  currency: string;
  subtotalCents: number;
  totalCents: number;
  paidCents: number;
  outstandingCents: number;
  clientVisible: boolean;
  clientScopeKey?: string;
  projectId?: string;
  sourceType: 'sprint-9-placeholder';
};

@Injectable()
export class InvoicesRepository extends TenantAwareRepository {
  list(context: TenantContext): InvoiceRecordPlaceholder[] {
    const tenant = this.requireTenantContext(context);

    return [this.placeholderInvoice(tenant.tenantId)];
  }

  create(
    context: TenantContext,
    actor: ActorContext | undefined,
    dto: CreateInvoiceDto,
  ): InvoiceRecordPlaceholder {
    const tenant = this.requireTenantContext(context);
    const subtotalCents = (dto.lines ?? []).reduce(
      (total, line) => total + line.quantity * line.unitAmountCents,
      0,
    );

    return {
      clientScopeKey: dto.clientScopeKey,
      clientVisible: true,
      currency: dto.currency,
      id: randomUUID(),
      invoiceNumber: dto.invoiceNumber,
      outstandingCents: subtotalCents,
      paidCents: 0,
      projectId: dto.projectId,
      sourceType: 'sprint-9-placeholder',
      status: 'DRAFT',
      subtotalCents,
      tenantId: tenant.tenantId,
      totalCents: subtotalCents,
    };
  }

  getById(context: TenantContext, id: string): InvoiceRecordPlaceholder {
    const tenant = this.requireTenantContext(context);

    return {
      ...this.placeholderInvoice(tenant.tenantId),
      id,
    };
  }

  update(
    context: TenantContext,
    actor: ActorContext | undefined,
    id: string,
    dto: UpdateInvoiceDto,
  ): InvoiceRecordPlaceholder {
    const tenant = this.requireTenantContext(context);
    const totalCents = 250000;
    const paidCents = dto.paidCents ?? 125000;

    return {
      clientScopeKey: dto.clientScopeKey ?? 'client-scope-placeholder',
      clientVisible: true,
      currency: dto.currency ?? 'EUR',
      id,
      invoiceNumber: 'INV-S9-001',
      outstandingCents: Math.max(totalCents - paidCents, 0),
      paidCents,
      projectId: 'sprint-9-project-placeholder',
      sourceType: 'sprint-9-placeholder',
      status: dto.status ?? 'PARTIALLY_PAID',
      subtotalCents: totalCents,
      tenantId: tenant.tenantId,
      totalCents,
    };
  }

  listClientVisible(context: TenantContext): InvoiceRecordPlaceholder[] {
    const tenant = this.requireTenantContext(context);

    return [
      {
        ...this.placeholderInvoice(tenant.tenantId),
        clientVisible: true,
      },
    ];
  }

  getClientVisibleById(context: TenantContext, id: string): InvoiceRecordPlaceholder {
    const tenant = this.requireTenantContext(context);

    return {
      ...this.placeholderInvoice(tenant.tenantId),
      clientVisible: true,
      id,
    };
  }

  private placeholderInvoice(tenantId: string): InvoiceRecordPlaceholder {
    return {
      clientScopeKey: 'client-scope-placeholder',
      clientVisible: true,
      currency: 'EUR',
      id: 'sprint-9-invoice-placeholder',
      invoiceNumber: 'INV-S9-001',
      outstandingCents: 125000,
      paidCents: 125000,
      projectId: 'sprint-9-project-placeholder',
      sourceType: 'sprint-9-placeholder',
      status: 'PARTIALLY_PAID',
      subtotalCents: 250000,
      tenantId,
      totalCents: 250000,
    };
  }
}
