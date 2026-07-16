import { Injectable } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { PaymentsRepository } from './payments.repository';

@Injectable()
export class PaymentsService {
  constructor(private readonly repo: PaymentsRepository) {}

  list(tenantId: string) { return this.repo.list(tenantId); }
  create(tenantId: string, actorId: string, dto: { invoiceId?: string; amountCents: number; currency: string; method?: PaymentMethod }) {
    return this.repo.create(tenantId, actorId, dto);
  }
  get(tenantId: string, id: string) { return this.repo.getById(tenantId, id); }
}