import { Injectable } from '@nestjs/common';
import { CrmPipelineStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.lead.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, company: true, email: true, phone: true,
        source: true, status: true, createdAt: true, updatedAt: true,
        owner: { select: { id: true, displayName: true } },
      },
    });
  }

  create(tenantId: string, actorId: string, dto: CreateLeadDto) {
    return this.prisma.lead.create({
      data: {
        tenantId, name: dto.name, company: dto.company, email: dto.email,
        phone: dto.phone, source: dto.source, ownerUserId: actorId,
      },
    });
  }

  getById(tenantId: string, id: string) {
    return this.prisma.lead.findFirst({
      where: { id, tenantId },
      include: {
        owner: { select: { id: true, displayName: true, email: true } },
        opportunities: { select: { id: true, title: true, status: true, valueCents: true } },
        meetings: { select: { id: true, title: true, status: true, scheduledAt: true } },
        followUps: { select: { id: true, title: true, status: true, dueAt: true } },
      },
    });
  }

  update(tenantId: string, id: string, dto: Partial<CreateLeadDto> & { status?: CrmPipelineStatus }) {
    return this.prisma.lead.update({
      where: { id, tenantId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.company !== undefined && { company: dto.company }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.source !== undefined && { source: dto.source }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
  }

  delete(tenantId: string, id: string) {
    return this.prisma.lead.delete({ where: { id, tenantId } });
  }
}
