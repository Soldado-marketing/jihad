import { Injectable } from '@nestjs/common';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantContext } from '../../common/tenant/tenant-context';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { SubtasksRepository } from './subtasks.repository';

@Injectable()
export class SubtasksService {
  constructor(
    private readonly subtasksRepository: SubtasksRepository,
    private readonly resourceScopeService: ResourceScopeService,
    private readonly auditService: AuditService,
  ) {}

  listForTask(context: TenantContext, taskId: string) {
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });

    return this.subtasksRepository.listForTask(context, taskId);
  }

  createForTask(
    context: TenantContext,
    actor: ActorContext | undefined,
    taskId: string,
    dto: CreateSubtaskDto,
  ) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    const subtask = this.subtasksRepository.createForTask(context, actor, taskId, dto);
    const auditEvent = this.auditService.createAuditEventPlaceholder({
      action: 'subtask.created',
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId: subtask.id,
      resourceType: 'subtask',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: { subtask },
    });

    return { subtask, auditEvent };
  }

  updateSubtask(
    context: TenantContext,
    actor: ActorContext | undefined,
    id: string,
    dto: UpdateSubtaskDto,
  ) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    const subtask = this.subtasksRepository.update(context, actor, id, dto);
    const auditEvent = this.auditService.createAuditEventPlaceholder({
      action: 'subtask.updated',
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId: subtask.id,
      resourceType: 'subtask',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: { subtask },
    });

    return { subtask, auditEvent };
  }
}
