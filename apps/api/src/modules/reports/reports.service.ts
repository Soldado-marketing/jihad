import { Injectable } from '@nestjs/common';
import { ReportsRepository } from './reports.repository';

@Injectable()
export class ReportsService {
  constructor(private readonly repo: ReportsRepository) {}

  list(tenantId: string) { return this.repo.listDefinitions(tenantId); }
  get(tenantId: string, id: string) { return this.repo.getDefinitionById(tenantId, id); }
  create(tenantId: string, actorId: string, name: string) {
    return this.repo.createDefinition(tenantId, actorId, name);
  }
  run(tenantId: string, id: string, actorId: string) { return this.repo.runReport(tenantId, id, actorId); }
}
