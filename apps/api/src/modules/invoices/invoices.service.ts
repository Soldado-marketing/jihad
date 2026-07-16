import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { InvoicesRepository, CreateInvoiceDto } from './invoices.repository';

@Injectable()
export class InvoicesService {
  constructor(private readonly repo: InvoicesRepository) {}

  list(tenantId: string) { return this.repo.list(tenantId); }
  create(tenantId: string, actorId: string, dto: CreateInvoiceDto) { return this.repo.create(tenantId, actorId, dto); }

  async get(tenantId: string, id: string) {
    const item = await this.repo.getById(tenantId, id);
    if (!item) throw new NotFoundException('Invoice not found');
    return item;
  }

  async updateStatus(tenantId: string, id: string, status: InvoiceStatus) {
    await this.get(tenantId, id);
    return this.repo.updateStatus(tenantId, id, status);
  }
}