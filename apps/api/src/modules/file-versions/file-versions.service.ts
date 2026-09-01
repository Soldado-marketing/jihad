/**
 * Phase 3 - File version orchestration: upload, listing, and authorised
 * download / preview.
 *
 * Upload ordering is deliberate. The version row is RESERVED first (status
 * QUARANTINED), the bytes are written to the bucket second, and the row is
 * promoted to ACTIVE third. A crash between steps leaves a quarantined row and
 * possibly an orphan object - never an ACTIVE row pointing at missing bytes.
 *
 * Download never hands a storage key or a bucket URL to the browser: the object
 * is streamed through the API after authorisation.
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, FileVersionStatus, MembershipRole } from '@prisma/client';
import type { Readable } from 'node:stream';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import {
  FileTooLargeError,
  UnsupportedFileTypeError,
  contentDispositionFilename,
  resolveDisposition,
  validateUpload,
} from '../storage/file-type';
import {
  UnsafeObjectKeyError,
  assertKeyBelongsToTenant,
  buildObjectKey,
  sanitizeOriginalName,
} from '../storage/object-key';
import { StorageService } from '../storage/storage.service';
import {
  FileVersionsRepository,
  PublicFileVersion,
} from './file-versions.repository';

export interface UploadedFileInput {
  originalname: string;
  mimetype?: string;
  buffer: Buffer;
  size?: number;
}

export interface ActorInput {
  actorId: string;
  role: string;
  sessionId?: string;
  tenantId: string;
}

export interface DownloadResult {
  stream: Readable;
  contentType: string;
  contentLength?: number;
  filename: string;
  disposition: 'inline' | 'attachment';
}

/** Statuses a caller is allowed to download. */
const DOWNLOADABLE_STATUSES: ReadonlySet<FileVersionStatus> = new Set([
  FileVersionStatus.ACTIVE,
  FileVersionStatus.SUPERSEDED,
]);

@Injectable()
export class FileVersionsService {
  private readonly logger = new Logger(FileVersionsService.name);

  constructor(
    private readonly repo: FileVersionsRepository,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  /** Per-file upload ceiling, surfaced so the controller can advertise it. */
  maxUploadBytes(): number {
    return this.storage.getMaxUploadBytes();
  }

  private async requireFileAsset(tenantId: string, fileAssetId: string) {
    const asset = await this.repo.getFileAsset(tenantId, fileAssetId);
    // A row belonging to another tenant is reported as 404, not 403, so the
    // response cannot be used to probe for ids across tenants.
    if (!asset) throw new NotFoundException('File not found');
    return asset;
  }

  async list(tenantId: string, fileAssetId: string): Promise<PublicFileVersion[]> {
    await this.requireFileAsset(tenantId, fileAssetId);
    return this.repo.listVersions(tenantId, fileAssetId);
  }

  async getOne(
    tenantId: string,
    fileAssetId: string,
    versionId: string,
  ): Promise<PublicFileVersion> {
    await this.requireFileAsset(tenantId, fileAssetId);
    const version = await this.repo.getPublicVersion(tenantId, fileAssetId, versionId);
    if (!version) throw new NotFoundException('File version not found');
    return version;
  }

  /**
   * Stores an uploaded file as a new version of the asset.
   *
   * Validation happens before anything is reserved or written: size first
   * (cheapest), then extension allow-list, then content signature.
   */
  async upload(
    actor: ActorInput,
    fileAssetId: string,
    file: UploadedFileInput,
  ): Promise<PublicFileVersion> {
    const { tenantId } = actor;
    const asset = await this.requireFileAsset(tenantId, fileAssetId);

    if (!file || !Buffer.isBuffer(file.buffer)) {
      throw new BadRequestException({
        code: 'FILE_REQUIRED',
        reason: 'A multipart field named "file" is required.',
      });
    }

    const originalName = sanitizeOriginalName(file.originalname);

    let validated;
    try {
      validated = validateUpload({
        buffer: file.buffer,
        declaredContentType: file.mimetype,
        maxBytes: this.storage.getMaxUploadBytes(),
        originalName,
      });
    } catch (error) {
      await this.recordAudit(actor, 'file.version.upload', fileAssetId, {
        outcome: AuditOutcome.FAILURE,
        permissionResult: AuditPermissionResult.ALLOWED,
        payload: { fileAssetId, reason: (error as Error).message },
      });

      if (error instanceof FileTooLargeError) {
        throw new BadRequestException({ code: 'FILE_TOO_LARGE', reason: error.message });
      }
      if (error instanceof UnsupportedFileTypeError) {
        throw new BadRequestException({ code: 'UNSUPPORTED_FILE_TYPE', reason: error.message });
      }
      throw error;
    }

    const keyPrefix = this.storage.getKeyPrefix();
    const reservation = await this.reserveWithRetry({
      actorId: actor.actorId,
      fileAssetId: asset.id,
      keyPrefix,
      originalName,
      sizeBytes: validated.sizeBytes,
      tenantId,
    });

    try {
      await this.storage.putObject({
        body: file.buffer,
        contentType: validated.contentType,
        key: reservation.storageKey,
        metadata: {
          fileAssetId: asset.id,
          tenantId,
          versionNumber: String(reservation.versionNumber),
        },
      });
    } catch (error) {
      // Roll the reservation back so no row survives pointing at missing bytes.
      await this.repo.deleteVersion(tenantId, reservation.id).catch(() => undefined);
      await this.recordAudit(actor, 'file.version.upload', fileAssetId, {
        outcome: AuditOutcome.FAILURE,
        permissionResult: AuditPermissionResult.ALLOWED,
        payload: { fileAssetId, reason: 'storage_write_failed' },
      });
      this.logger.error(`storage_write_failed asset=${asset.id}`);
      throw error;
    }

    const activated = await this.repo.activateVersion({
      contentType: validated.contentType,
      fileAssetId: asset.id,
      sizeBytes: validated.sizeBytes,
      tenantId,
      versionId: reservation.id,
    });

    await this.recordAudit(actor, 'file.version.upload', fileAssetId, {
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      payload: {
        contentType: validated.contentType,
        fileAssetId,
        fileVersionId: activated.id,
        sizeBytes: validated.sizeBytes,
        versionNumber: activated.versionNumber,
      },
    });

    return activated;
  }

  /**
   * Reserves a version number, retrying once when a concurrent upload wins the
   * unique constraint on (tenantId, fileAssetId, versionNumber).
   */
  private async reserveWithRetry(params: {
    tenantId: string;
    fileAssetId: string;
    actorId: string;
    originalName: string;
    sizeBytes: number;
    keyPrefix: string;
  }): Promise<{ id: string; versionNumber: number; storageKey: string }> {
    const { tenantId, fileAssetId, actorId, originalName, sizeBytes, keyPrefix } = params;

    const attempt = () =>
      this.repo.reserveVersion({
        actorId,
        buildKey: (versionNumber) =>
          buildObjectKey({ fileAssetId, keyPrefix, originalName, tenantId, versionNumber }),
        fileAssetId,
        originalName,
        sizeBytes,
        tenantId,
      });

    try {
      return await attempt();
    } catch (error) {
      const isUniqueViolation =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
      if (!isUniqueViolation) throw error;
      return attempt();
    }
  }

  /**
   * Authorises and opens a download or preview stream.
   *
   * Gates, in order:
   *  1. tenant isolation (the query is already tenant-scoped)
   *  2. the version must carry bytes and be in a downloadable status
   *  3. the stored key must sit inside this tenant's namespace
   *  4. a CLIENT may only read a client-visible asset that has been APPROVED
   */
  async openDownload(
    actor: ActorInput,
    fileAssetId: string,
    versionId: string,
    requestedDisposition: 'inline' | 'attachment',
  ): Promise<DownloadResult> {
    const { tenantId } = actor;
    await this.requireFileAsset(tenantId, fileAssetId);

    const version = await this.repo.getVersionWithKey(tenantId, fileAssetId, versionId);
    if (!version) throw new NotFoundException('File version not found');

    if (!version.storageKey) {
      throw new NotFoundException('File version has no stored content');
    }
    if (!DOWNLOADABLE_STATUSES.has(version.status)) {
      await this.recordAudit(actor, 'file.version.download', fileAssetId, {
        outcome: AuditOutcome.BLOCKED,
        permissionResult: AuditPermissionResult.DENIED,
        payload: { fileVersionId: versionId, reason: `status_${version.status.toLowerCase()}` },
      });
      throw new ForbiddenException({
        code: 'FILE_VERSION_NOT_DOWNLOADABLE',
        reason: `File version status is ${version.status}.`,
      });
    }

    // Defence in depth: a tampered or legacy row must not reach another
    // tenant's objects even though the query was already tenant-scoped.
    try {
      assertKeyBelongsToTenant(version.storageKey, this.storage.getKeyPrefix(), tenantId);
    } catch (error) {
      if (error instanceof UnsafeObjectKeyError) {
        await this.recordAudit(actor, 'file.version.download', fileAssetId, {
          outcome: AuditOutcome.BLOCKED,
          permissionResult: AuditPermissionResult.DENIED,
          payload: { fileVersionId: versionId, reason: 'storage_key_outside_tenant_namespace' },
        });
        this.logger.error(`storage_key_tenant_mismatch version=${versionId}`);
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          reason: 'resource_tenant_scope_mismatch',
        });
      }
      throw error;
    }

    if (actor.role === MembershipRole.CLIENT) {
      await this.assertClientMayRead(actor, version.fileAsset.clientVisible, fileAssetId, versionId);
    }

    const object = await this.storage.getObjectStream(version.storageKey);
    const contentType = version.fileAsset.mimeType ?? object.contentType;
    const disposition = resolveDisposition(contentType, requestedDisposition);
    const filename = contentDispositionFilename(
      version.originalName ?? version.fileAsset.name,
    );

    await this.recordAudit(actor, 'file.version.download', fileAssetId, {
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      payload: { disposition, fileVersionId: versionId, versionNumber: version.versionNumber },
    });

    return {
      contentLength: object.contentLength,
      contentType,
      disposition,
      filename,
      stream: object.stream,
    };
  }

  /** A client may read only an explicitly client-visible, APPROVED file. */
  private async assertClientMayRead(
    actor: ActorInput,
    clientVisible: boolean,
    fileAssetId: string,
    versionId: string,
  ): Promise<void> {
    if (!clientVisible) {
      await this.recordAudit(actor, 'file.version.download', fileAssetId, {
        outcome: AuditOutcome.BLOCKED,
        permissionResult: AuditPermissionResult.DENIED,
        payload: { fileVersionId: versionId, reason: 'file_not_client_visible' },
      });
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        reason: 'file_not_client_visible',
      });
    }

    const approved = await this.repo.hasApprovedApproval(actor.tenantId, fileAssetId, versionId);
    if (!approved) {
      await this.recordAudit(actor, 'file.version.download', fileAssetId, {
        outcome: AuditOutcome.BLOCKED,
        permissionResult: AuditPermissionResult.DENIED,
        payload: { fileVersionId: versionId, reason: 'file_not_approved' },
      });
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        reason: 'file_not_approved',
      });
    }
  }

  /**
   * The JWT carries the role as a plain string. Only a value that is a real
   * MembershipRole is written to the audit row; anything else is left unset
   * rather than coerced.
   */
  private toMembershipRole(role: string): MembershipRole | undefined {
    return (Object.values(MembershipRole) as string[]).includes(role)
      ? (role as MembershipRole)
      : undefined;
  }

  /** Audit writes are best-effort: a logging failure must not fail the request. */
  private async recordAudit(
    actor: ActorInput,
    action: string,
    resourceId: string,
    detail: {
      outcome: AuditOutcome;
      permissionResult: AuditPermissionResult;
      payload?: Record<string, unknown>;
    },
  ): Promise<void> {
    try {
      await this.audit.createAuditEvent({
        action,
        actorId: actor.actorId,
        actorRole: this.toMembershipRole(actor.role),
        outcome: detail.outcome,
        payload: detail.payload,
        permissionResult: detail.permissionResult,
        resourceId,
        resourceType: 'file-version',
        sessionId: actor.sessionId,
        tenantId: actor.tenantId,
      });
    } catch {
      this.logger.warn(`audit_write_failed action=${action}`);
    }
  }
}
