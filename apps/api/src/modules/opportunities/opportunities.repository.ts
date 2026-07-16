import { Injectable } from '@nestjs/common';
import { CrmPipelineStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';

@Injectable()
export class OpportunitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.opportunity.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, valueCents: true, currency: true,
        status: true, expectedCloseAt: true, createdAt: true, updatedAt: true,
        lead: { select: { id: true, name: true, company: true } },
        owner: { select: { id: true, displayName: true } },
      },
    });
  }

  create(tenantId: string, actorId: string, dto: CreateOpportunityDto) {
    return this.prisma.opportunity.create({
      data: {
        tenantId, title: dto.title, leadId: dto.leadId,
        valueCents: dto.valueCents, currency: dto.currency ?? 'USD',
        ownerUserId: actorId,
        expectedCloseAt: dto.expectedCloseAt ? new Date(dto.expectedCloseAt) : undefined,
      },
    });
  }

  getById(tenantId: string, id: string) {
    return this.prisma.opportunity.findFirst({
      where: { id, tenantId },
      include: {
        lead: { select: { id: true, name: true, company: true } },
        owner: { select: { id: true, displayName: true } },
        meetings: { select: { id: true, title: true, status: true, scheduledAt: true } },
        followUps: { select: { id: true, title: true, status: true, dueAt: true } },
      },
    });
  }

  update(tenantId: string, id: string, dto: Partial<CreateOpportunityDto> & { status?: CrmPipelineStatus }) {
    return this.prisma.opportunity.update({
      where: { id, tenantId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.valueCents !== undefined && { valueCents: dto.valueCents }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.expectedCloseAt !== undefined && {
          expectedCloseAt: dto.expectedCloseAt ? new Date(dto.expectedCloseAt) : null,
        }),
      },
    });
  }

  delete(tenantId: string, id: string) {
    return this.prisma.opportunity.delete({ where: { id, tenantId } });
  }
}
