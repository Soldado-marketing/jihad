import { Injectable } from '@nestjs/common';
import { FollowUpStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';

@Injectable()
export class FollowUpsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.followUp.findMany({
      where: { tenantId },
      orderBy: { dueAt: 'asc' },
      select: {
        id: true, title: true, status: true, dueAt: true, createdAt: true, updatedAt: true,
        lead: { select: { id: true, name: true } },
        opportunity: { select: { id: true, title: true } },
        owner: { select: { id: true, displayName: true } },
      },
    });
  }

  create(tenantId: string, actorId: string, dto: CreateFollowUpDto) {
    return this.prisma.followUp.create({
      data: {
        tenantId, title: dto.title, leadId: dto.leadId, opportunityId: dto.opportunityId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined, ownerUserId: actorId,
      },
    });
  }

  getById(tenantId: string, id: string) {
    return this.prisma.followUp.findFirst({
      where: { id, tenantId },
      include: {
        lead: { select: { id: true, name: true } },
        opportunity: { select: { id: true, title: true } },
        owner: { select: { id: true, displayName: true } },
      },
    });
  }

  update(tenantId: string, id: string, dto: Partial<CreateFollowUpDto> & { status?: FollowUpStatus }) {
    return this.prisma.followUp.update({
      where: { id, tenantId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.dueAt !== undefined && { dueAt: dto.dueAt ? new Date(dto.dueAt) : null }),
      },
    });
  }

  delete(tenantId: string, id: string) {
    return this.prisma.followUp.delete({ where: { id, tenantId } });
  }
}
