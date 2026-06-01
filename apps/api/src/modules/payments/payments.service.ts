import { Injectable } from '@nestjs/common';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantContext } from '../../common/tenant/tenant-context';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { FinanceService } from '../finance/finance.service';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentRecordPlaceholder, PaymentsRepository } from './payments.repository';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly resourceScopeService: ResourceScopeService,
    private readonly auditService: AuditService,
    private readonly financeService: FinanceService,
  ) {}

  listPayments(context: TenantContext, actor: ActorContext | undefined) {
    this.financeService.assertOwnerOnlyFinanceAccess(context, actor);
    return this.paymentsRepository.list(context);
  }

  createPayment(
    context: TenantContext,
    actor: ActorContext | undefined,
    dto: CreatePaymentDto,
  ) {
    this.financeService.assertOwnerOnlyFinanceAccess(context, actor);
    const payment = this.paymentsRepository.create(context, actor, dto);

    return {
      auditEvent: this.recordPaymentAudit(context, actor, payment),
      payment,
      partialPaymentBaseline: payment.status === 'PARTIAL' || Boolean(payment.invoiceId),
    };
  }

  listClientPayments(context: TenantContext, actor: ActorContext | undefined) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    return this.paymentsRepository.listClientVisible(context).map((payment) =>
      this.toClientPayment(payment),
    );
  }

  private toClientPayment(payment: PaymentRecordPlaceholder) {
    return {
      amountCents: payment.amountCents,
      currency: payment.currency,
      id: payment.id,
      invoiceId: payment.invoiceId,
      method: payment.method,
      status: payment.status,
    };
  }

  private recordPaymentAudit(
    context: TenantContext,
    actor: ActorContext | undefined,
    payment: PaymentRecordPlaceholder,
  ) {
    return this.auditService.createAuditEventPlaceholder({
      action: 'payment.recorded',
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId: payment.id,
      resourceType: 'payment',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: {
        amountCents: payment.amountCents,
        currency: payment.currency,
        invoiceId: payment.invoiceId,
        paymentProviderPayload: 'not-integrated-redacted-placeholder',
        paymentStatus: payment.status,
      },
    });
  }
}
