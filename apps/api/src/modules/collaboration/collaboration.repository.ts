import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CollaborationRepository {
  constructor(private readonly prisma: PrismaService) {}

  listNotes(tenantId: string, resourceType?: string, resourceId?: string) {
    return this.prisma.internalNote.findMany({
      where: {
        tenantId,
        ...(resourceType ? { resourceType } : {}),
        ...(resourceId ? { resourceId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, body: true, resourceType: true, resourceId: true,
        threadKey: true, createdAt: true, updatedAt: true,
        createdBy: { select: { id: true, displayName: true } },
      },
    });
  }

  createNote(tenantId: string, actorId: string, body: string, resourceType?: string, resourceId?: string, threadKey?: string) {
    return this.prisma.internalNote.create({
      data: {
        tenantId, body, resourceType, resourceId, threadKey, createdByUserId: actorId,
      },
    });
  }

  getNoteById(tenantId: string, id: string) {
    return this.prisma.internalNote.findFirst({
      where: { id, tenantId },
      include: { createdBy: { select: { id: true, displayName: true } } },
    });
  }

  updateNote(tenantId: string, id: string, body: string) {
    return this.prisma.internalNote.update({
      where: { id, tenantId },
      data: { body },
    });
  }

  deleteNote(tenantId: string, id: string) {
    return this.prisma.internalNote.delete({ where: { id, tenantId } });
  }
}