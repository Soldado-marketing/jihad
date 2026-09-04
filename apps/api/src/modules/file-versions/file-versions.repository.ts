/**
 * Phase 3 - File version data access.
 *
 * Two projections exist on purpose:
 *  - PUBLIC_VERSION_SELECT never includes storageKey, and is the ONLY shape
 *    that reaches a controller response.
 *  - getVersionWithKey is internal: it returns the key so the service can
 *    stream the object server-side. Its result must never be serialised.
 *
 * Every query is filtered by tenantId, so a caller cannot reach another
 * tenant's row even with a valid id.
 */

import { Injectable } from '@nestjs/common';
import { ApprovalStatus, FileVersionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Response-safe projection. Deliberately omits storageKey. */
const PUBLIC_VERSION_SELECT = {
  id: true,
  fileAssetId: true,
  versionNumber: true,
  originalName: true,
  sizeBytes: true,
  status: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.FileVersionSelect;

export type PublicFileVersion = Prisma.FileVersionGetPayload<{
  select: typeof PUBLIC_VERSION_SELECT;
}>;

export interface FileAssetForVersioning {
  id: string;
  tenantId: string;
  name: string;
  mimeType: string | null;
  clientVisible: boolean;
  projectId: string | null;
  taskId: string | null;
}

export interface VersionWithKey {
  id: string;
  tenantId: string;
  fileAssetId: string;
  versionNumber: number;
  originalName: string | null;
  storageKey: string | null;
  sizeBytes: number | null;
  status: FileVersionStatus;
  fileAsset: FileAssetForVersioning;
}

@Injectable()
export class FileVersionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Loads the parent asset, scoped to the tenant. Returns null when absent. */
  getFileAsset(tenantId: string, fileAssetId: string): Promise<FileAssetForVersioning | null> {
    return this.prisma.fileAsset.findFirst({
      where: { id: fileAssetId, tenantId },
      select: {
        id: true,
        tenantId: true,
        name: true,
        mimeType: true,
        clientVisible: true,
        projectId: true,
        taskId: true,
      },
    });
  }

  /** Response-safe list of the asset's versions, newest first. */
  listVersions(tenantId: string, fileAssetId: string): Promise<PublicFileVersion[]> {
    return this.prisma.fileVersion.findMany({
      where: { tenantId, fileAssetId },
      orderBy: { versionNumber: 'desc' },
      select: PUBLIC_VERSION_SELECT,
    });
  }

  /** Response-safe single version. */
  getPublicVersion(
    tenantId: string,
    fileAssetId: string,
    versionId: string,
  ): Promise<PublicFileVersion | null> {
    return this.prisma.fileVersion.findFirst({
      where: { id: versionId, tenantId, fileAssetId },
      select: PUBLIC_VERSION_SELECT,
    });
  }

  /**
   * INTERNAL ONLY - includes storageKey so the service can open a stream.
   * The result must never be returned from a controller.
   */
  getVersionWithKey(
    tenantId: string,
    fileAssetId: string,
    versionId: string,
  ): Promise<VersionWithKey | null> {
    return this.prisma.fileVersion.findFirst({
      where: { id: versionId, tenantId, fileAssetId },
      select: {
        id: true,
        tenantId: true,
        fileAssetId: true,
        versionNumber: true,
        originalName: true,
        storageKey: true,
        sizeBytes: true,
        status: true,
        fileAsset: {
          select: {
            id: true,
            tenantId: true,
            name: true,
            mimeType: true,
            clientVisible: true,
            projectId: true,
            taskId: true,
          },
        },
      },
    });
  }

  /**
   * Reserves the next version number and creates the row in QUARANTINED state,
   * meaning "allocated but the bytes are not in the bucket yet".
   *
   * The unique constraint on (tenantId, fileAssetId, versionNumber) is what
   * actually serialises concurrent uploads; the caller retries on P2002.
   *
   * The storage key is produced by buildKey(versionNumber) so the server, not
   * the client, decides where the object lives.
   */
  async reserveVersion(params: {
    tenantId: string;
    fileAssetId: string;
    actorId: string;
    originalName: string;
    sizeBytes: number;
    buildKey: (versionNumber: number) => string;
  }): Promise<{ id: string; versionNumber: number; storageKey: string }> {
    const { tenantId, fileAssetId, actorId, originalName, sizeBytes, buildKey } = params;

    return this.prisma.$transaction(async (tx) => {
      const highest = await tx.fileVersion.aggregate({
        where: { tenantId, fileAssetId },
        _max: { versionNumber: true },
      });

      const versionNumber = (highest._max.versionNumber ?? 0) + 1;
      const storageKey = buildKey(versionNumber);

      const created = await tx.fileVersion.create({
        data: {
          tenantId,
          fileAssetId,
          versionNumber,
          originalName,
          sizeBytes,
          storageKey,
          status: FileVersionStatus.QUARANTINED,
          createdByUserId: actorId,
        },
        select: { id: true, versionNumber: true },
      });

      return { id: created.id, storageKey, versionNumber };
    });
  }

  /**
   * Promotes a reserved version to ACTIVE once the bytes are stored, supersedes
   * every previously ACTIVE version, and refreshes the parent asset's summary.
   */
  async activateVersion(params: {
    tenantId: string;
    fileAssetId: string;
    versionId: string;
    sizeBytes: number;
    contentType: string;
  }): Promise<PublicFileVersion> {
    const { tenantId, fileAssetId, versionId, sizeBytes, contentType } = params;

    return this.prisma.$transaction(async (tx) => {
      await tx.fileVersion.updateMany({
        where: {
          tenantId,
          fileAssetId,
          status: FileVersionStatus.ACTIVE,
          id: { not: versionId },
        },
        data: { status: FileVersionStatus.SUPERSEDED },
      });

      const activated = await tx.fileVersion.update({
        where: { id: versionId, tenantId },
        data: { status: FileVersionStatus.ACTIVE },
        select: PUBLIC_VERSION_SELECT,
      });

      const versionCount = await tx.fileVersion.count({
        where: { tenantId, fileAssetId },
      });

      await tx.fileAsset.update({
        where: { id: fileAssetId, tenantId },
        data: { mimeType: contentType, sizeBytes, versionCount },
      });

      return activated;
    });
  }

  /** Removes a reservation whose upload failed, so no row points at missing bytes. */
  async deleteVersion(tenantId: string, versionId: string): Promise<void> {
    await this.prisma.fileVersion.deleteMany({ where: { id: versionId, tenantId } });
  }

  /**
   * True when an APPROVED approval request covers this version, or covers the
   * parent asset without naming a specific version.
   */
  async hasApprovedApproval(
    tenantId: string,
    fileAssetId: string,
    fileVersionId: string,
  ): Promise<boolean> {
    const approved = await this.prisma.approvalRequest.findFirst({
      where: {
        tenantId,
        status: ApprovalStatus.APPROVED,
        OR: [{ fileVersionId }, { fileAssetId, fileVersionId: null }],
      },
      select: { id: true },
    });

    return approved !== null;
  }
}
