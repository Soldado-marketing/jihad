import { Injectable } from '@nestjs/common';
import { ApprovalStatus, FileVersionStatus, FileVisibility, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';

// Minimal type used by SignedUrlService and other callers that only need id + tenantId
export type FileAssetRecord = { id: string; tenantId: string; name?: string };

/**
 * visibility and clientVisible are two views of the same decision. Keeping them
 * in sync in one place stops the client-portal gate (which reads clientVisible)
 * from disagreeing with the API surface (which reads visibility).
 */
function visibilityFields(
  visibility: 'INTERNAL' | 'CLIENT_VISIBLE' | undefined,
): { visibility: FileVisibility; clientVisible: boolean } | undefined {
  if (visibility === undefined) return undefined;
  return {
    clientVisible: visibility === 'CLIENT_VISIBLE',
    visibility: visibility as FileVisibility,
  };
}

@Injectable()
export class FilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.fileAsset.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, mimeType: true, sizeBytes: true, visibility: true,
        clientVisible: true, versionCount: true, createdAt: true, updatedAt: true, taskId: true,
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, displayName: true } },
      },
    });
  }

  /**
   * The client-portal view of the same table.
   *
   * Two gates, both server-side: the asset must be client-visible, and it must
   * carry an APPROVED approval — either for the asset as a whole or for one of
   * its versions. Only the versions covered by that approval are returned, and
   * storageKey is never selected.
   */
  listForClient(tenantId: string) {
    return this.prisma.fileAsset.findMany({
      where: {
        tenantId,
        clientVisible: true,
        approvalRequests: { some: { tenantId, status: ApprovalStatus.APPROVED } },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, mimeType: true, versionCount: true, createdAt: true,
        project: { select: { id: true, name: true } },
        versions: {
          where: {
            status: FileVersionStatus.ACTIVE,
            OR: [
              { approvalRequests: { some: { tenantId, status: ApprovalStatus.APPROVED } } },
              {
                fileAsset: {
                  approvalRequests: {
                    some: { tenantId, status: ApprovalStatus.APPROVED, fileVersionId: null },
                  },
                },
              },
            ],
          },
          orderBy: { versionNumber: 'desc' },
          select: {
            id: true, versionNumber: true, originalName: true, sizeBytes: true, createdAt: true,
          },
        },
      },
    });
  }

  create(tenantId: string, actorId: string, dto: CreateFileDto) {
    const visibility = visibilityFields(dto.visibility);

    return this.prisma.fileAsset.create({
      data: {
        tenantId,
        name: dto.name,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        createdByUserId: actorId,
        projectId: dto.projectId,
        taskId: dto.taskId,
        clientScopeKey: dto.clientScopeKey,
        ...(visibility ?? {}),
      },
    });
  }

  getById(tenantId: string, id: string) {
    return this.prisma.fileAsset.findFirst({
      where: { id, tenantId },
      include: {
        // storageKey is deliberately excluded: version content is reached only
        // through the authorised content route, never by key.
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 5,
          select: {
            id: true, versionNumber: true, originalName: true, sizeBytes: true,
            status: true, createdAt: true, createdByUserId: true,
          },
        },
        createdBy: { select: { id: true, displayName: true } },
      },
    });
  }

  update(tenantId: string, id: string, dto: UpdateFileDto) {
    const visibility = visibilityFields(dto.visibility);

    const data: Prisma.FileAssetUpdateInput = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.mimeType !== undefined && { mimeType: dto.mimeType }),
      ...(dto.sizeBytes !== undefined && { sizeBytes: dto.sizeBytes }),
      ...(dto.clientScopeKey !== undefined && { clientScopeKey: dto.clientScopeKey }),
      ...(visibility ?? {}),
    };

    return this.prisma.fileAsset.update({ where: { id, tenantId }, data });
  }

  delete(tenantId: string, id: string) {
    return this.prisma.fileAsset.delete({ where: { id, tenantId } });
  }
}
