import { Injectable } from '@nestjs/common';
import { FinanceRepository } from './finance.repository';

@Injectable()
export class FinanceService {
  constructor(private readonly repo: FinanceRepository) {}

  getSummary(tenantId: string) { return this.repo.getSummary(tenantId); }
  listRevenue(tenantId: string) { return this.repo.listRevenue(tenantId); }
  listCosts(tenantId: string) { return this.repo.listCosts(tenantId); }
}
