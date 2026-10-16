import { Injectable } from '@nestjs/common';
import { FinanceRepository } from './finance.repository';

@Injectable()
export class FinanceService {
  constructor(private readonly repo: FinanceRepository) {}

  getSummary(tenantId: string) { return this.repo.getSummary(tenantId); }
  listRevenue(tenantId: string) { return this.repo.listRevenue(tenantId); }
  listCosts(tenantId: string) { return this.repo.listCosts(tenantId); }

  /** Phase 4 - revenue, cost and margin broken down per project. */
  getProfitability(tenantId: string) { return this.repo.getProfitability(tenantId); }

  /** MAOS-T75 - the same revenue, cost and stored labour, summed per customer. */
  getCustomerProfitability(tenantId: string) { return this.repo.getCustomerProfitability(tenantId); }
}
