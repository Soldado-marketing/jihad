import { ForbiddenException, Injectable } from '@nestjs/common';
import { ActorContext } from '../../common/auth/actor-context';
import { MembershipRole } from '../../common/identity/membership-role';
import { TenantContext } from '../../common/tenant/tenant-context';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { CreateCostRecordDto } from './dto/create-cost-record.dto';
import { CreateRevenueRecordDto } from './dto/create-revenue-record.dto';
import {
  CostRecordPlaceholder,
  FinanceRepository,
  RevenueRecordPlaceholder,
} from './finance.repository';

@Injectable()
export class FinanceService {
  constructor(
    private readonly financeRepository: FinanceRepository,
    private readonly resourceScopeService: ResourceScopeService,
    private readonly auditService: AuditService,
  ) {}

  listRevenue(context: TenantContext, actor: ActorContext | undefined) {
    this.assertOwnerOnlyFinanceAccess(context, actor);
    return this.financeRepository.listRevenue(context);
  }

  createRevenue(
    context: TenantContext,
    actor: ActorContext | undefined,
    dto: CreateRevenueRecordDto,
  ) {
    this.assertOwnerOnlyFinanceAccess(context, actor);
    const revenue = this.financeRepository.createRevenue(context, actor, dto);

    return {
      auditEvent: this.recordRevenueAudit(context, actor, revenue),
      revenue,
    };
  }

  listCosts(context: TenantContext, actor: ActorContext | undefined) {
    this.assertOwnerOnlyFinanceAccess(context, actor);
    return this.financeRepository.listCosts(context);
  }

  createCost(context: TenantContext, actor: ActorContext | undefined, dto: CreateCostRecordDto) {
    this.assertOwnerOnlyFinanceAccess(context, actor);
    const cost = this.financeRepository.createCost(context, actor, dto);

    return {
      auditEvent: this.recordCostAudit(context, actor, cost),
      cost,
    };
  }

  getProfitabilitySummary(context: TenantContext, actor: ActorContext | undefined) {
    this.assertOwnerOnlyFinanceAccess(context, actor);

    return {
      profitabilitySummary: this.financeRepository.getProfitabilitySummary(context),
      advancedProfitabilityAnalyticsDeferred: true,
    };
  }

  assertOwnerOnlyFinanceAccess(context: TenantContext, actor: ActorContext | undefined) {
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });

    if (actor?.role === MembershipRole.OWNER) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
      return;
    }

    this.recordFinanceAccessDeniedAudit(context, actor);
    throw new ForbiddenException({
      code: 'FORBIDDEN',
      reason: 'owner_only_finance_access_required',
    });
  }

  recordFinanceAccessDeniedAudit(context: TenantContext, actor: ActorContext | undefined) {
    return this.auditService.createAuditEventPlaceholder({
      action: 'finance.access.denied',
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      failureCategory: 'owner-only-finance-boundary',
      outcome: AuditOutcome.BLOCKED,
      permissionResult: AuditPermissionResult.DENIED,
      resourceId: 'finance-owner-only',
      resourceType: 'finance',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: {
        deniedRole: actor?.role ?? 'missing-actor',
        sensitiveFinancePayload: 'redacted-placeholder',
      },
    });
  }

  private recordRevenueAudit(
    context: TenantContext,
    actor: ActorContext | undefined,
    revenue: RevenueRecordPlaceholder,
  ) {
    return this.auditService.createAuditEventPlaceholder({
      action: 'revenue.created',
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId: revenue.id,
      resourceType: 'revenue-record',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: {
        amountCents: revenue.amountCents,
        currency: revenue.currency,
        sourceType: revenue.sourceType,
      },
    });
  }

  private recordCostAudit(
    context: TenantContext,
    actor: ActorContext | undefined,
    cost: CostRecordPlaceholder,
  ) {
    return this.auditService.createAuditEventPlaceholder({
      action: 'cost.created',
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId: cost.id,
      resourceType: 'cost-record',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: {
        amountCents: cost.amountCents,
        costType: cost.costType,
        currency: cost.currency,
      },
    });
  }
}
