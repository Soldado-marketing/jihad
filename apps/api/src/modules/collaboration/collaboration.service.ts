import { Injectable } from '@nestjs/common';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantContext } from '../../common/tenant/tenant-context';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { CollaborationRepository, InternalNoteRecord } from './collaboration.repository';
import { CreateInternalNoteDto } from './dto/create-internal-note.dto';

@Injectable()
export class CollaborationService {
  constructor(
    private readonly collaborationRepository: CollaborationRepository,
    private readonly resourceScopeService: ResourceScopeService,
    private readonly auditService: AuditService,
  ) {}

  listInternalNotes(context: TenantContext) {
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });

    return this.collaborationRepository.listInternalNotes(context);
  }

  createInternalNote(
    context: TenantContext,
    actor: ActorContext | undefined,
    dto: CreateInternalNoteDto,
  ) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    const internalNote = this.collaborationRepository.createInternalNote(context, actor, dto);
    return {
      internalNote,
      auditEvent: this.recordAudit(context, actor, internalNote),
    };
  }

  private recordAudit(
    context: TenantContext,
    actor: ActorContext | undefined,
    internalNote: InternalNoteRecord,
  ) {
    return this.auditService.createAuditEventPlaceholder({
      action: 'internal_note.created',
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId: internalNote.id,
      resourceType: 'internal-note',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: {
        internalOnly: true,
        noteId: internalNote.id,
        resourceId: internalNote.resourceId,
        resourceType: internalNote.resourceType,
        threadKey: internalNote.threadKey,
      },
    });
  }
}
