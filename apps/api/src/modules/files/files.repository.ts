import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Minimal type used by SignedUrlService and other callers that only need id + tenantId
export type FileAssetRecord = { id: string; tenantId: string; name?: string };

@Injectable()
export class FilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.fileAsset.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, mimeType: true, sizeBytes: true, visibility: true,
        versionCount: true, createdAt: true, updatedAt: true, taskId: true,
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, displayName: true } },
      },
    });
  }

  create(tenantId: string, actorId: string, dto: { name: string; mimeType?: string; sizeBytes?: number; projectId?: string; taskId?: string }) {
    return this.prisma.fileAsset.create({
      data: {
        tenantId,
        name: dto.name,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        createdByUserId: actorId,
        projectId: dto.projectId,
        taskId: dto.taskId,
      },
    });
  }

  getById(tenantId: string, id: string) {
    return this.prisma.fileAsset.findFirst({
      where: { id, tenantId },
      include: {
        versions: { orderBy: { createdAt: 'desc' }, take: 5 },
        createdBy: { select: { id: true, displayName: true } },
      },
    });
  }

  update(tenantId: string, id: string, dto: { name?: string }) {
    return this.prisma.fileAsset.update({
      where: { id, tenantId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
      },
    });
  }

  delete(tenantId: string, id: string) {
    return this.prisma.fileAsset.delete({ where: { id, tenantId } });
  }
}