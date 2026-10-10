import { Injectable } from '@nestjs/common';
import { ClientScopeService } from '../memberships/client-scope.service';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { DashboardsRepository } from './dashboards.repository';

@Injectable()
export class DashboardsService {
  constructor(
    private readonly repo: DashboardsRepository,
    private readonly clientScope: ClientScopeService,
    private readonly resourceScope: ResourceScopeService,
  ) {}

  /**
   * Internal roles get tenant-wide counts. A CONTRACTOR gets counts of their
   * assigned projects, tasks and files only, and 0 for areas outside their
   * work (CRM, notes, approvals, voice notes, invoices); the response shape
   * stays the same so the dashboard renders unchanged.
   */
  async getWorkspaceSummary(tenantId: string, actorId: string) {
    const scope = await this.resourceScope.resolveWorkScope(tenantId, actorId);
    if (!scope) return this.repo.getWorkspaceSummary(tenantId);
    return this.repo.getAssignedWorkSummary(tenantId, {
      project: this.resourceScope.projectWhere(scope),
      task: this.resourceScope.taskWhere(scope),
      file: this.resourceScope.fileWhere(scope),
    });
  }

  /**
   * Counts for the client portal dashboard. A CLIENT's scope comes from its
   * database membership (fail closed); internal roles keep tenant-wide counts.
   */
  async getClientSummary(tenantId: string, actorId: string, role: string) {
    const scope = await this.clientScope.resolve(tenantId, actorId, role);
    return this.repo.getClientSummary(tenantId, scope);
  }
}