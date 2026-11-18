import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** One shape for every answer, so a new comment shows its author like a listed one. */
const NOTE_SELECT = {
  id: true, body: true, resourceType: true, resourceId: true,
  threadKey: true, createdAt: true, updatedAt: true,
  createdBy: { select: { id: true, displayName: true } },
} satisfies Prisma.InternalNoteSelect;

export type NoteRow = Prisma.InternalNoteGetPayload<{ select: typeof NOTE_SELECT }>;

@Injectable()
export class CollaborationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** `visibility` narrows the list to what the caller may see (collaboration.service). */
  listNotes(tenantId: string, resourceType?: string, resourceId?: string, visibility: Prisma.InternalNoteWhereInput = {}) {
    return this.prisma.internalNote.findMany({
      where: {
        tenantId,
        ...(resourceType ? { resourceType } : {}),
        ...(resourceId ? { resourceId } : {}),
        ...visibility,
      },
      orderBy: { createdAt: 'desc' },
      select: NOTE_SELECT,
    });
  }

  createNote(tenantId: string, actorId: string, body: string, resourceType?: string, resourceId?: string, threadKey?: string) {
    return this.prisma.internalNote.create({
      data: {
        tenantId, body, resourceType, resourceId, threadKey, createdByUserId: actorId,
      },
      select: NOTE_SELECT,
    });
  }

  getNoteById(tenantId: string, id: string) {
    return this.prisma.internalNote.findFirst({
      where: { id, tenantId },
      select: NOTE_SELECT,
    });
  }

  updateNote(tenantId: string, id: string, body: string) {
    return this.prisma.internalNote.update({
      where: { id, tenantId },
      data: { body },
      select: NOTE_SELECT,
    });
  }

  deleteNote(tenantId: string, id: string) {
    return this.prisma.internalNote.delete({ where: { id, tenantId } });
  }
}
