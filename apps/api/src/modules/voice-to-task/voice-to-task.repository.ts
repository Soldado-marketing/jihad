import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VoiceToTaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  getDraft(tenantId: string, id: string) {
    return this.prisma.voiceToTaskDraft.findFirst({
      where: { id, voiceNote: { tenantId } },
      select: { id: true, title: true, description: true, suggestedPriority: true, status: true },
    });
  }

  listDrafts(tenantId: string) {
    return this.prisma.voiceToTaskDraft.findMany({
      where: { voiceNote: { tenantId } },
      include: { voiceNote: true, createdBy: { select: { displayName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  createDraft(tenantId: string, actorId: string, voiceNoteId: string) {
    return this.prisma.voiceToTaskDraft.create({
      data: {
        tenantId,
        voiceNoteId,
        createdByUserId: actorId,
        title: 'Draft from voice note',
        status: 'NEEDS_REVIEW',
      },
      include: { voiceNote: true },
    });
  }

  async confirmDraft(tenantId: string, actorId: string, id: string) {
    const draft = await this.prisma.voiceToTaskDraft.findFirst({ where: { id, voiceNote: { tenantId } } });
    if (!draft) throw new NotFoundException('Draft not found');
    return this.prisma.voiceToTaskDraft.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    });
  }
}