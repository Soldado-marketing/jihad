import { Injectable } from '@nestjs/common';
import { TenantAwareRepository } from '../../common/repositories/tenant-aware.repository';
import { TenantContext } from '../../common/tenant/tenant-context';

export type SummaryMetric = {
  label: string;
  value: number | string;
  hidden?: boolean;
};

export type WorkspaceSummaryPlaceholder = {
  tenantId: string;
  projectTasks: SummaryMetric[];
  crm: SummaryMetric[];
  collaboration: SummaryMetric[];
  filesApprovals: SummaryMetric[];
  voiceAi: SummaryMetric[];
  financeOwnerOnly: SummaryMetric[];
  hiddenCountTotalSuppression: true;
  sourceType: 'sprint-10-placeholder';
};

export type ClientSummaryPlaceholder = {
  tenantId: string;
  projects: SummaryMetric[];
  tasks: SummaryMetric[];
  invoices: SummaryMetric[];
  hiddenCountTotalSuppression: true;
  sourceType: 'sprint-10-client-safe-placeholder';
};

@Injectable()
export class DashboardsRepository extends TenantAwareRepository {
  getWorkspaceSummary(context: TenantContext): WorkspaceSummaryPlaceholder {
    const tenant = this.requireTenantContext(context);

    return {
      collaboration: [
        { label: 'Internal notes', value: 4 },
        { label: 'Unread notifications', value: 3 },
      ],
      crm: [
        { label: 'Leads', value: 8 },
        { label: 'Open opportunities', value: 3 },
      ],
      filesApprovals: [
        { label: 'Files', value: 12 },
        { label: 'Approval requests', value: 5 },
      ],
      financeOwnerOnly: [
        { label: 'Revenue', value: '€2,500.00' },
        { label: 'Costs', value: 'owner-only-suppressed-for-non-owner', hidden: true },
      ],
      hiddenCountTotalSuppression: true,
      projectTasks: [
        { label: 'Active projects', value: 6 },
        { label: 'Open tasks', value: 18 },
      ],
      sourceType: 'sprint-10-placeholder',
      tenantId: tenant.tenantId,
      voiceAi: [
        { label: 'Voice notes', value: 2 },
        { label: 'Task drafts awaiting review', value: 1 },
      ],
    };
  }

  getClientSummary(context: TenantContext): ClientSummaryPlaceholder {
    const tenant = this.requireTenantContext(context);

    return {
      hiddenCountTotalSuppression: true,
      invoices: [
        { label: 'Visible invoices', value: 1 },
        { label: 'Hidden finance totals', value: 'suppressed', hidden: true },
      ],
      projects: [{ label: 'Visible projects', value: 2 }],
      sourceType: 'sprint-10-client-safe-placeholder',
      tasks: [{ label: 'Visible tasks', value: 5 }],
      tenantId: tenant.tenantId,
    };
  }
}
