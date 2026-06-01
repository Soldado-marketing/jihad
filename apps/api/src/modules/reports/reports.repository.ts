import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantAwareRepository } from '../../common/repositories/tenant-aware.repository';
import { TenantContext } from '../../common/tenant/tenant-context';
import { CreateReportDefinitionDto } from './dto/create-report-definition.dto';

export type ReportVisibilityValue = 'INTERNAL' | 'OWNER_ONLY' | 'CLIENT_SAFE';

export type ReportDefinitionPlaceholder = {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  visibility: ReportVisibilityValue;
  sourceType: 'sprint-10-placeholder';
};

export type ReportRunPlaceholder = {
  id: string;
  tenantId: string;
  reportDefinitionId: string;
  visibility: ReportVisibilityValue;
  hiddenTotalsSuppressed: true;
  result: Array<{ label: string; value: string | number; hidden?: boolean }>;
  sourceType: 'sprint-10-placeholder';
};

@Injectable()
export class ReportsRepository extends TenantAwareRepository {
  list(context: TenantContext): ReportDefinitionPlaceholder[] {
    const tenant = this.requireTenantContext(context);

    return [this.placeholderReport(tenant.tenantId)];
  }

  create(
    context: TenantContext,
    actor: ActorContext | undefined,
    dto: CreateReportDefinitionDto,
  ): ReportDefinitionPlaceholder {
    const tenant = this.requireTenantContext(context);

    return {
      description: dto.description,
      id: randomUUID(),
      name: dto.name,
      sourceType: 'sprint-10-placeholder',
      tenantId: tenant.tenantId,
      visibility: dto.visibility ?? 'INTERNAL',
    };
  }

  getById(context: TenantContext, id: string): ReportDefinitionPlaceholder {
    const tenant = this.requireTenantContext(context);

    return {
      ...this.placeholderReport(tenant.tenantId),
      id,
    };
  }

  run(context: TenantContext, reportDefinitionId: string): ReportRunPlaceholder {
    const tenant = this.requireTenantContext(context);

    return {
      hiddenTotalsSuppressed: true,
      id: randomUUID(),
      reportDefinitionId,
      result: [
        { label: 'Visible projects', value: 6 },
        { hidden: true, label: 'Hidden finance total', value: 'suppressed' },
      ],
      sourceType: 'sprint-10-placeholder',
      tenantId: tenant.tenantId,
      visibility: 'INTERNAL',
    };
  }

  private placeholderReport(tenantId: string): ReportDefinitionPlaceholder {
    return {
      description: 'Permission-filtered MVP report placeholder.',
      id: 'sprint-10-report-placeholder',
      name: 'MVP delivery summary',
      sourceType: 'sprint-10-placeholder',
      tenantId,
      visibility: 'INTERNAL',
    };
  }
}
