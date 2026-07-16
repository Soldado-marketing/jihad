import { Injectable } from '@nestjs/common';
import { DashboardsRepository } from './dashboards.repository';

@Injectable()
export class DashboardsService {
  constructor(private readonly repo: DashboardsRepository) {}

  getWorkspaceSummary(tenantId: string, actorId: string) {
    return this.repo.getWorkspaceSummary(tenantId);
  }

  getClientSummary(tenantId: string, actorId: string) {
    return this.repo.getClientSummary(tenantId);
  }
}