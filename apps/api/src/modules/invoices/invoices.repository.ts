import { Injectable } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateInvoiceDto {
  invoiceNumber: string;
  currency: string;
  projectId?: string;
  dueAt?: string;
}

@Injectable()
export class InvoicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.invoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, invoiceNumber: true, status: true, currency: true,
        subtotalCents: true, totalCents: true, paidCents: true,
        issuedAt: true, dueAt: true, createdAt: true, updatedAt: true,
        project: { select: { id: true, name: true } },
      },
    });
  }

  create(tenantId: string, actorId: string, dto: CreateInvoiceDto) {
    return this.prisma.invoice.create({
      data: {
        tenantId,
        invoiceNumber: dto.invoiceNumber,
        currency: dto.currency ?? 'USD',
        projectId: dto.projectId,
        createdByUserId: actorId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      },
    });
  }

  getById(tenantId: string, id: string) {
    return this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        lines: true,
        payments: { select: { id: true, amountCents: true, receivedAt: true, method: true } },
        project: { select: { id: true, name: true } },
      },
    });
  }

  updateStatus(tenantId: string, id: string, status: InvoiceStatus) {
    return this.prisma.invoice.update({
      where: { id, tenantId },
      data: { status },
    });
  }
}
