import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantAwareRepository } from '../../common/repositories/tenant-aware.repository';
import { TenantContext } from '../../common/tenant/tenant-context';
import { CreateFileVersionDto } from '../file-versions/dto/create-file-version.dto';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';

export type FileVisibilityValue = 'INTERNAL' | 'CLIENT_VISIBLE';

export type FileAssetRecord = {
  id: string;
  tenantId: string;
  name: string;
  mimeType?: string;
  sizeBytes?: number;
  projectId?: string;
  taskId?: string;
  visibility: FileVisibilityValue;
  clientVisible: boolean;
  clientScopeKey?: string;
  versionCount: number;
  createdByUserId?: string;
  sourceType: 'sprint-6-placeholder';
};

export type FileVersionRecord = {
  id: string;
  tenantId: string;
  fileAssetId: string;
  versionNumber: number;
  originalName?: string;
  storageKey?: string;
  sizeBytes?: number;
  status: 'ACTIVE' | 'SUPERSEDED' | 'QUARANTINED' | 'BLOCKED';
  createdByUserId?: string;
  sourceType: 'sprint-6-placeholder';
};

@Injectable()
export class FilesRepository extends TenantAwareRepository {
  list(context: TenantContext): FileAssetRecord[] {
    const tenant = this.requireTenantContext(context);

    return [this.placeholderFile(tenant.tenantId)];
  }

  create(context: TenantContext, actor: ActorContext | undefined, dto: CreateFileDto): FileAssetRecord {
    const tenant = this.requireTenantContext(context);
    const visibility = dto.visibility ?? 'INTERNAL';

    return {
      clientScopeKey: dto.clientScopeKey,
      clientVisible: visibility === 'CLIENT_VISIBLE',
      createdByUserId: actor?.actorId,
      id: randomUUID(),
      mimeType: dto.mimeType,
      name: dto.name,
      projectId: dto.projectId,
      sizeBytes: dto.sizeBytes,
      sourceType: 'sprint-6-placeholder',
      taskId: dto.taskId,
      tenantId: tenant.tenantId,
      versionCount: 0,
      visibility,
    };
  }

  getById(context: TenantContext, id: string): FileAssetRecord {
    const tenant = this.requireTenantContext(context);

    return {
      ...this.placeholderFile(tenant.tenantId),
      id,
    };
  }

  update(
    context: TenantContext,
    actor: ActorContext | undefined,
    id: string,
    dto: UpdateFileDto,
  ): FileAssetRecord {
    const tenant = this.requireTenantContext(context);
    const visibility = dto.visibility ?? 'INTERNAL';

    return {
      clientScopeKey: dto.clientScopeKey,
      clientVisible: visibility === 'CLIENT_VISIBLE',
      createdByUserId: actor?.actorId,
      id,
      mimeType: dto.mimeType,
      name: dto.name ?? 'Sprint 6 File Placeholder',
      sizeBytes: dto.sizeBytes,
      sourceType: 'sprint-6-placeholder',
      tenantId: tenant.tenantId,
      versionCount: 1,
      visibility,
    };
  }

  listVersions(context: TenantContext, fileAssetId: string): FileVersionRecord[] {
    const tenant = this.requireTenantContext(context);

    return [this.placeholderVersion(tenant.tenantId, fileAssetId)];
  }

  createVersion(
    context: TenantContext,
    actor: ActorContext | undefined,
    fileAssetId: string,
    dto: CreateFileVersionDto,
  ): FileVersionRecord {
    const tenant = this.requireTenantContext(context);

    return {
      createdByUserId: actor?.actorId,
      fileAssetId,
      id: randomUUID(),
      originalName: dto.originalName,
      sizeBytes: dto.sizeBytes,
      sourceType: 'sprint-6-placeholder',
      status: 'ACTIVE',
      storageKey: dto.storageKey,
      tenantId: tenant.tenantId,
      versionNumber: 2,
    };
  }

  private placeholderFile(tenantId: string): FileAssetRecord {
    return {
      clientVisible: false,
      id: 'sprint-6-file-placeholder',
      mimeType: 'application/octet-stream',
      name: 'Sprint 6 File Placeholder',
      sourceType: 'sprint-6-placeholder',
      tenantId,
      versionCount: 1,
      visibility: 'INTERNAL',
    };
  }

  private placeholderVersion(tenantId: string, fileAssetId: string): FileVersionRecord {
    return {
      fileAssetId,
      id: 'sprint-6-file-version-placeholder',
      originalName: 'sprint-6-file-placeholder.bin',
      sourceType: 'sprint-6-placeholder',
      status: 'ACTIVE',
      storageKey: 'sprint-6/storage-placeholder',
      tenantId,
      versionNumber: 1,
    };
  }
}
