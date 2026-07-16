import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VoiceNotesRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.voiceNote.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, status: true, durationSeconds: true,
        languageHint: true, createdAt: true, updatedAt: true,
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
        createdBy: { select: { id: true, displayName: true } },
      },
    });
  }

  create(tenantId: string, actorId: string, title: string, projectId?: string, taskId?: string) {
    return this.prisma.voiceNote.create({
      data: { tenantId, title, createdByUserId: actorId, projectId, taskId },
    });
  }

  getById(tenantId: string, id: string) {
    return this.prisma.voiceNote.findFirst({
      where: { id, tenantId },
      include: {
        createdBy: { select: { id: true, displayName: true } },
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
        transcripts: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  delete(tenantId: string, id: string) {
    return this.prisma.voiceNote.delete({ where: { id, tenantId } });
  }
}
