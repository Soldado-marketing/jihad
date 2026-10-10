import { Injectable } from '@nestjs/common';
import { ClientScopeService } from '../memberships/client-scope.service';
import { DashboardsRepository } from './dashboards.repository';

@Injectable()
export class DashboardsService {
  constructor(
    private readonly repo: DashboardsRepository,
    private readonly clientScope: ClientScopeService,
  ) {}

  getWorkspaceSummary(tenantId: string, actorId: string) {
    return this.repo.getWorkspaceSummary(tenantId);
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