import { Injectable } from '@nestjs/common';
import { ActorContext } from '../../common/auth/actor-context';
import { MembershipRole } from '../../common/identity/membership-role';
import { TenantContext } from '../../common/tenant/tenant-context';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { DashboardsRepository } from './dashboards.repository';

@Injectable()
export class DashboardsService {
  constructor(
    private readonly dashboardsRepository: DashboardsRepository,
    private readonly resourceScopeService: ResourceScopeService,
    private readonly auditService: AuditService,
  ) {}

  getWorkspaceSummary(context: TenantContext, actor: ActorContext | undefined) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    const summary = this.dashboardsRepository.getWorkspaceSummary(context);
    const ownerCanViewFinance = actor?.role === MembershipRole.OWNER;

    return {
      auditEvent: this.recordDashboardViewed(context, actor, 'dashboard.viewed'),
      summary: {
        ...summary,
        financeOwnerOnly: ownerCanViewFinance
          ? summary.financeOwnerOnly
          : [{ label: 'Owner-only finance', value: 'suppressed', hidden: true }],
      },
    };
  }

  getClientSummary(context: TenantContext, actor: ActorContext | undefined) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    return {
      auditEvent: this.recordDashboardViewed(context, actor, 'client_dashboard.viewed'),
      summary: this.dashboardsRepository.getClientSummary(context),
    };
  }

  private recordDashboardViewed(
    context: TenantContext,
    actor: ActorContext | undefined,
    action: 'dashboard.viewed' | 'client_dashboard.viewed',
  ) {
    return this.auditService.createAuditEventPlaceholder({
      action,
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId: action,
      resourceType: 'dashboard',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: {
        hiddenCountTotalSuppression: true,
        summaryPayload: 'permission-filtered-redacted-placeholder',
      },
    });
  }
}
