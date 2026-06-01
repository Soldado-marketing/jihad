import { Injectable } from '@nestjs/common';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantContext } from '../../common/tenant/tenant-context';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { CreateReportDefinitionDto } from './dto/create-report-definition.dto';
import { ReportRunPlaceholder, ReportsRepository } from './reports.repository';

@Injectable()
export class ReportsService {
  constructor(
    private readonly reportsRepository: ReportsRepository,
    private readonly resourceScopeService: ResourceScopeService,
    private readonly auditService: AuditService,
  ) {}

  listReports(context: TenantContext, actor: ActorContext | undefined) {
    this.validateReportScope(context, actor);
    return this.reportsRepository.list(context);
  }

  createReport(
    context: TenantContext,
    actor: ActorContext | undefined,
    dto: CreateReportDefinitionDto,
  ) {
    this.validateReportScope(context, actor);
    const report = this.reportsRepository.create(context, actor, dto);

    return {
      auditEvent: this.recordReportAudit(context, actor, report.id, 'report.created'),
      report,
    };
  }

  getReport(context: TenantContext, actor: ActorContext | undefined, id: string) {
    this.validateReportScope(context, actor);
    return this.reportsRepository.getById(context, id);
  }

  runReport(context: TenantContext, actor: ActorContext | undefined, id: string) {
    this.validateReportScope(context, actor);
    const reportRun = this.applyHiddenCountTotalSuppression(this.reportsRepository.run(context, id));

    return {
      auditEvent: this.recordReportAudit(context, actor, reportRun.id, 'report.run'),
      hiddenTotalAuditEvent: this.recordReportAudit(
        context,
        actor,
        reportRun.id,
        'report.hidden_total.suppressed',
      ),
      reportRun,
    };
  }

  recordReportAccessDenied(context: TenantContext, actor: ActorContext | undefined) {
    return this.auditService.createAuditEventPlaceholder({
      action: 'report.access.denied',
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      failureCategory: 'permission-filtered-report-boundary',
      outcome: AuditOutcome.BLOCKED,
      permissionResult: AuditPermissionResult.DENIED,
      resourceId: 'report-access',
      resourceType: 'report',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: {
        hiddenCountsAndTotals: 'suppressed',
        reportPayload: 'redacted-placeholder',
      },
    });
  }

  private validateReportScope(context: TenantContext, actor: ActorContext | undefined) {
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });

    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }
  }

  private applyHiddenCountTotalSuppression(reportRun: ReportRunPlaceholder): ReportRunPlaceholder {
    return {
      ...reportRun,
      hiddenTotalsSuppressed: true,
      result: reportRun.result.map((row) =>
        row.hidden ? { ...row, value: 'suppressed' } : row,
      ),
    };
  }

  private recordReportAudit(
    context: TenantContext,
    actor: ActorContext | undefined,
    resourceId: string,
    action: 'report.created' | 'report.run' | 'report.hidden_total.suppressed',
  ) {
    return this.auditService.createAuditEventPlaceholder({
      action,
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId,
      resourceType: 'report',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: {
        hiddenCountTotalSuppression: true,
        reportPayload: 'permission-filtered-redacted-placeholder',
      },
    });
  }
}
