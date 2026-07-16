import { Injectable } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.payment.findMany({
      where: { tenantId },
      orderBy: { receivedAt: 'desc' },
      select: {
        id: true, amountCents: true, currency: true, method: true, status: true,
        receivedAt: true, createdAt: true,
        invoice: { select: { id: true, invoiceNumber: true } },
      },
    });
  }

  create(tenantId: string, actorId: string, dto: { invoiceId?: string; amountCents: number; currency: string; method?: PaymentMethod }) {
    return this.prisma.payment.create({
      data: {
        tenantId,
        invoiceId: dto.invoiceId,
        amountCents: dto.amountCents,
        currency: dto.currency ?? 'USD',
        method: dto.method ?? PaymentMethod.MANUAL,
        recordedByUserId: actorId,
      },
    });
  }

  getById(tenantId: string, id: string) {
    return this.prisma.payment.findFirst({
      where: { id, tenantId },
      include: { invoice: { select: { id: true, invoiceNumber: true } } },
    });
  }
}