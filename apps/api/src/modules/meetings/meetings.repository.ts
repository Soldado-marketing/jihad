import { Injectable } from '@nestjs/common';
import { MeetingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';

@Injectable()
export class MeetingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.meeting.findMany({
      where: { tenantId },
      orderBy: { scheduledAt: 'desc' },
      select: {
        id: true, title: true, status: true, scheduledAt: true, notes: true,
        createdAt: true, updatedAt: true,
        lead: { select: { id: true, name: true, company: true } },
        opportunity: { select: { id: true, title: true } },
      },
    });
  }

  create(tenantId: string, _actorId: string, dto: CreateMeetingDto) {
    return this.prisma.meeting.create({
      data: {
        tenantId, title: dto.title, leadId: dto.leadId, opportunityId: dto.opportunityId,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        notes: dto.notes,
      },
    });
  }

  getById(tenantId: string, id: string) {
    return this.prisma.meeting.findFirst({
      where: { id, tenantId },
      include: {
        lead: { select: { id: true, name: true } },
        opportunity: { select: { id: true, title: true } },
      },
    });
  }

  update(tenantId: string, id: string, dto: Partial<CreateMeetingDto> & { status?: MeetingStatus }) {
    return this.prisma.meeting.update({
      where: { id, tenantId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.scheduledAt !== undefined && {
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        }),
      },
    });
  }

  delete(tenantId: string, id: string) {
    return this.prisma.meeting.delete({ where: { id, tenantId } });
  }
}
