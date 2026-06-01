import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantAwareRepository } from '../../common/repositories/tenant-aware.repository';
import { TenantContext } from '../../common/tenant/tenant-context';
import { CreateCostRecordDto } from './dto/create-cost-record.dto';
import { CreateRevenueRecordDto } from './dto/create-revenue-record.dto';

export type RevenueRecordPlaceholder = {
  id: string;
  tenantId: string;
  sourceType: string;
  amountCents: number;
  currency: string;
  projectId?: string;
  invoiceId?: string;
  clientScopeKey?: string;
  sourceTypeMarker: 'sprint-9-placeholder';
};

export type CostRecordPlaceholder = {
  id: string;
  tenantId: string;
  costType: string;
  amountCents: number;
  currency: string;
  projectId?: string;
  vendorName?: string;
  sourceTypeMarker: 'sprint-9-placeholder';
};

export type ProfitabilitySummaryPlaceholder = {
  tenantId: string;
  revenueCents: number;
  costCents: number;
  grossProfitCents: number;
  advancedAnalyticsDeferred: true;
  sourceTypeMarker: 'sprint-9-placeholder';
};

@Injectable()
export class FinanceRepository extends TenantAwareRepository {
  listRevenue(context: TenantContext): RevenueRecordPlaceholder[] {
    const tenant = this.requireTenantContext(context);

    return [this.placeholderRevenue(tenant.tenantId)];
  }

  createRevenue(
    context: TenantContext,
    actor: ActorContext | undefined,
    dto: CreateRevenueRecordDto,
  ): RevenueRecordPlaceholder {
    const tenant = this.requireTenantContext(context);

    return {
      amountCents: dto.amountCents,
      clientScopeKey: dto.clientScopeKey,
      currency: dto.currency,
      id: randomUUID(),
      invoiceId: dto.invoiceId,
      projectId: dto.projectId,
      sourceType: dto.sourceType,
      sourceTypeMarker: 'sprint-9-placeholder',
      tenantId: tenant.tenantId,
    };
  }

  listCosts(context: TenantContext): CostRecordPlaceholder[] {
    const tenant = this.requireTenantContext(context);

    return [this.placeholderCost(tenant.tenantId)];
  }

  createCost(
    context: TenantContext,
    actor: ActorContext | undefined,
    dto: CreateCostRecordDto,
  ): CostRecordPlaceholder {
    const tenant = this.requireTenantContext(context);

    return {
      amountCents: dto.amountCents,
      costType: dto.costType,
      currency: dto.currency,
      id: randomUUID(),
      projectId: dto.projectId,
      sourceTypeMarker: 'sprint-9-placeholder',
      tenantId: tenant.tenantId,
      vendorName: dto.vendorName,
    };
  }

  getProfitabilitySummary(context: TenantContext): ProfitabilitySummaryPlaceholder {
    const tenant = this.requireTenantContext(context);
    const revenue = this.placeholderRevenue(tenant.tenantId);
    const cost = this.placeholderCost(tenant.tenantId);

    return {
      advancedAnalyticsDeferred: true,
      costCents: cost.amountCents,
      grossProfitCents: revenue.amountCents - cost.amountCents,
      revenueCents: revenue.amountCents,
      sourceTypeMarker: 'sprint-9-placeholder',
      tenantId: tenant.tenantId,
    };
  }

  private placeholderRevenue(tenantId: string): RevenueRecordPlaceholder {
    return {
      amountCents: 250000,
      clientScopeKey: 'client-scope-placeholder',
      currency: 'EUR',
      id: 'sprint-9-revenue-placeholder',
      invoiceId: 'sprint-9-invoice-placeholder',
      projectId: 'sprint-9-project-placeholder',
      sourceType: 'invoice',
      sourceTypeMarker: 'sprint-9-placeholder',
      tenantId,
    };
  }

  private placeholderCost(tenantId: string): CostRecordPlaceholder {
    return {
      amountCents: 85000,
      costType: 'contractor',
      currency: 'EUR',
      id: 'sprint-9-cost-placeholder',
      projectId: 'sprint-9-project-placeholder',
      sourceTypeMarker: 'sprint-9-placeholder',
      tenantId,
      vendorName: 'Internal cost placeholder',
    };
  }
}
