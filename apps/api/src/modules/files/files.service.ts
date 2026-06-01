import { Injectable } from '@nestjs/common';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantContext } from '../../common/tenant/tenant-context';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { CreateFileVersionDto } from '../file-versions/dto/create-file-version.dto';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { FileAssetRecord, FilesRepository, FileVersionRecord } from './files.repository';
import { SignedUrlService } from './signed-url.service';

@Injectable()
export class FilesService {
  constructor(
    private readonly filesRepository: FilesRepository,
    private readonly resourceScopeService: ResourceScopeService,
    private readonly auditService: AuditService,
    private readonly signedUrlService: SignedUrlService,
  ) {}

  listFiles(context: TenantContext) {
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });

    return this.filesRepository.list(context);
  }

  createFile(context: TenantContext, actor: ActorContext | undefined, dto: CreateFileDto) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    const file = this.filesRepository.create(context, actor, dto);
    return {
      file,
      auditEvent: this.recordFileAudit(context, actor, file, 'file.created'),
    };
  }

  getFile(context: TenantContext, id: string) {
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });

    return this.filesRepository.getById(context, id);
  }

  updateFile(
    context: TenantContext,
    actor: ActorContext | undefined,
    id: string,
    dto: UpdateFileDto,
  ) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    const file = this.filesRepository.update(context, actor, id, dto);
    return {
      file,
      auditEvent: this.recordFileAudit(context, actor, file, 'file.updated'),
    };
  }

  listVersions(context: TenantContext, fileId: string) {
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });

    return this.filesRepository.listVersions(context, fileId);
  }

  createVersion(
    context: TenantContext,
    actor: ActorContext | undefined,
    fileId: string,
    dto: CreateFileVersionDto,
  ) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    const version = this.filesRepository.createVersion(context, actor, fileId, dto);
    return {
      version,
      auditEvent: this.recordVersionAudit(context, actor, version),
    };
  }

  getSignedUrl(context: TenantContext, actor: ActorContext | undefined, id: string) {
    const file = this.filesRepository.getById(context, id);

    return this.signedUrlService.generateDownloadUrl(context, actor, file);
  }

  private recordFileAudit(
    context: TenantContext,
    actor: ActorContext | undefined,
    file: FileAssetRecord,
    action: 'file.created' | 'file.updated',
  ) {
    return this.auditService.createAuditEventPlaceholder({
      action,
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId: file.id,
      resourceType: 'file',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: {
        clientVisible: file.clientVisible,
        fileId: file.id,
        visibility: file.visibility,
      },
    });
  }

  private recordVersionAudit(
    context: TenantContext,
    actor: ActorContext | undefined,
    version: FileVersionRecord,
  ) {
    return this.auditService.createAuditEventPlaceholder({
      action: 'file.version.created',
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId: version.id,
      resourceType: 'file-version',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: {
        fileAssetId: version.fileAssetId,
        versionId: version.id,
        versionNumber: version.versionNumber,
      },
    });
  }
}
