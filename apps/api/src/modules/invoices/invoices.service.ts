import { Injectable } from '@nestjs/common';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantContext } from '../../common/tenant/tenant-context';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { FinanceService } from '../finance/finance.service';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceRecordPlaceholder, InvoicesRepository } from './invoices.repository';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly invoicesRepository: InvoicesRepository,
    private readonly resourceScopeService: ResourceScopeService,
    private readonly auditService: AuditService,
    private readonly financeService: FinanceService,
  ) {}

  listInvoices(context: TenantContext, actor: ActorContext | undefined) {
    this.financeService.assertOwnerOnlyFinanceAccess(context, actor);
    return this.invoicesRepository.list(context);
  }

  createInvoice(
    context: TenantContext,
    actor: ActorContext | undefined,
    dto: CreateInvoiceDto,
  ) {
    this.financeService.assertOwnerOnlyFinanceAccess(context, actor);
    const invoice = this.invoicesRepository.create(context, actor, dto);

    return {
      auditEvent: this.recordInvoiceAudit(context, actor, invoice, 'invoice.created'),
      invoice,
    };
  }

  getInvoice(context: TenantContext, actor: ActorContext | undefined, id: string) {
    this.financeService.assertOwnerOnlyFinanceAccess(context, actor);
    return this.invoicesRepository.getById(context, id);
  }

  updateInvoice(
    context: TenantContext,
    actor: ActorContext | undefined,
    id: string,
    dto: UpdateInvoiceDto,
  ) {
    this.financeService.assertOwnerOnlyFinanceAccess(context, actor);
    const invoice = this.invoicesRepository.update(context, actor, id, dto);

    return {
      auditEvent: this.recordInvoiceAudit(context, actor, invoice, 'invoice.updated'),
      invoice,
    };
  }

  listClientInvoices(context: TenantContext, actor: ActorContext | undefined) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    return this.invoicesRepository.listClientVisible(context).map((invoice) =>
      this.toClientInvoice(invoice),
    );
  }

  getClientInvoice(context: TenantContext, actor: ActorContext | undefined, id: string) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    const invoice = this.invoicesRepository.getClientVisibleById(context, id);

    return {
      auditEvent: this.auditService.createAuditEventPlaceholder({
        action: 'client.invoice.viewed',
        actorId: actor?.actorId,
        actorRole: actor?.role,
        deviceId: actor?.deviceId,
        outcome: AuditOutcome.SUCCESS,
        permissionResult: AuditPermissionResult.ALLOWED,
        resourceId: invoice.id,
        resourceType: 'invoice',
        sessionId: actor?.sessionId,
        tenantId: context.tenantId,
        payload: {
          clientScopeKey: invoice.clientScopeKey,
          financePayload: 'client-safe-invoice-placeholder',
          invoiceId: invoice.id,
        },
      }),
      invoice: this.toClientInvoice(invoice),
    };
  }

  private toClientInvoice(invoice: InvoiceRecordPlaceholder) {
    return {
      currency: invoice.currency,
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      outstandingCents: invoice.outstandingCents,
      paidCents: invoice.paidCents,
      status: invoice.status,
      totalCents: invoice.totalCents,
    };
  }

  private recordInvoiceAudit(
    context: TenantContext,
    actor: ActorContext | undefined,
    invoice: InvoiceRecordPlaceholder,
    action: 'invoice.created' | 'invoice.updated',
  ) {
    return this.auditService.createAuditEventPlaceholder({
      action,
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId: invoice.id,
      resourceType: 'invoice',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: {
        currency: invoice.currency,
        invoiceId: invoice.id,
        invoiceStatus: invoice.status,
        totalCents: invoice.totalCents,
      },
    });
  }
}
