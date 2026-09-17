import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ClientScopeService } from '../memberships/client-scope.service';
import {
  UnsafeObjectKeyError,
  assertKeyBelongsToTenant,
} from '../storage/object-key';
import { StorageService } from '../storage/storage.service';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { FilesRepository } from './files.repository';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly repo: FilesRepository,
    private readonly storage: StorageService,
    private readonly clientScope: ClientScopeService,
  ) {}

  list(tenantId: string) { return this.repo.list(tenantId); }

  /** Client-portal list: the caller's client scope, client-visible, approved only. */
  async listForClient(tenantId: string, actorId: string, role: string) {
    const scope = await this.clientScope.resolve(tenantId, actorId, role);
    return this.repo.listForClient(tenantId, scope);
  }

  create(tenantId: string, actorId: string, dto: CreateFileDto) {
    return this.repo.create(tenantId, actorId, dto);
  }

  async get(tenantId: string, id: string) {
    const item = await this.repo.getById(tenantId, id);
    // Rows from another tenant are simply not found by the scoped query, so a
    // caller cannot use this route to probe for ids across tenants.
    if (!item) throw new NotFoundException('File not found');
    return item;
  }

  async update(tenantId: string, id: string, dto: UpdateFileDto) {
    await this.get(tenantId, id);
    return this.repo.update(tenantId, id, dto);
  }

  /**
   * Deletes the asset, its versions (by cascade), and the bytes they own.
   *
   * The objects go first and the rows second. The reverse order is what left
   * orphans behind: once the version row is gone nothing records its key, so a
   * failed or absent storage delete became unrecoverable. Removing the objects
   * first means a storage failure aborts the whole delete and leaves the asset
   * intact and retryable.
   */
  async delete(tenantId: string, id: string) {
    await this.get(tenantId, id);
    await this.purgeStoredObjects(tenantId, id);
    return this.repo.delete(tenantId, id);
  }

  /**
   * Removes every object owned by this asset's versions.
   *
   * Keys are read from tenant-scoped rows only - never from the caller - and
   * each one is re-checked against the tenant namespace before it reaches the
   * bucket, the same gate the download path applies. Validation runs over the
   * whole set first, so a single tampered row aborts the delete before any
   * object is touched rather than leaving a half-deleted file behind.
   *
   * Keys are unique per version (.../files/<assetId>/v<n>/<uuid>), so no object
   * is ever shared with another asset or version and deleting one cannot affect
   * anything else.
   */
  private async purgeStoredObjects(tenantId: string, fileAssetId: string): Promise<void> {
    const versions = await this.repo.listVersionStorageKeys(tenantId, fileAssetId);
    const keys = versions
      .map((version) => version.storageKey)
      .filter((key): key is string => typeof key === 'string' && key.length > 0);

    // A metadata-only asset owns no bytes, so storage is never consulted for it
    // and the delete still works on a deployment without object storage.
    if (keys.length === 0) return;

    if (!this.storage.isConfigured()) {
      throw new ServiceUnavailableException({
        code: 'STORAGE_NOT_CONFIGURED',
        reason:
          'This file has stored content, but object storage is not configured. '
          + 'Deleting it now would leave its objects behind untracked.',
      });
    }

    const keyPrefix = this.storage.getKeyPrefix();

    for (const key of keys) {
      try {
        assertKeyBelongsToTenant(key, keyPrefix, tenantId);
      } catch (error) {
        if (error instanceof UnsafeObjectKeyError) {
          // Keys are never logged: they are the capability that protects the object.
          this.logger.error(`storage_key_tenant_mismatch file=${fileAssetId}`);
          throw new ForbiddenException({
            code: 'FORBIDDEN',
            reason: 'resource_tenant_scope_mismatch',
          });
        }
        throw error;
      }
    }

    // DeleteObject is idempotent, so a retry after a partial failure converges
    // instead of erroring on the objects that were already removed.
    for (const key of keys) {
      await this.storage.deleteObject(key);
    }

    this.logger.log(`file_objects_deleted file=${fileAssetId} count=${keys.length}`);
  }
}
