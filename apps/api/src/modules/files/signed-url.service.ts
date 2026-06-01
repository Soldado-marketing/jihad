import { Injectable } from '@nestjs/common';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantContext } from '../../common/tenant/tenant-context';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { FileAssetRecord } from './files.repository';

export type SignedUrlPlaceholder = {
  method: 'GET';
  expiresInSeconds: 300;
  url: string;
  fileId: string;
  tenantId: string;
  auditEvent: unknown;
};

@Injectable()
export class SignedUrlService {
  constructor(
    private readonly resourceScopeService: ResourceScopeService,
    private readonly auditService: AuditService,
  ) {}

  generateDownloadUrl(
    context: TenantContext,
    actor: ActorContext | undefined,
    file: FileAssetRecord,
  ): SignedUrlPlaceholder {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: file.tenantId });
    }

    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: file.tenantId,
    });

    const auditEvent = this.auditService.createAuditEventPlaceholder({
      action: 'file.signed_url.requested',
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
        expiresInSeconds: 300,
        fileId: file.id,
        signedUrlPayload: 'redacted-placeholder',
      },
    });

    return {
      auditEvent,
      expiresInSeconds: 300,
      fileId: file.id,
      method: 'GET',
      tenantId: context.tenantId,
      url: `https://signed-url.placeholder/${context.tenantId}/${file.id}?ttl=300`,
    };
  }
}
