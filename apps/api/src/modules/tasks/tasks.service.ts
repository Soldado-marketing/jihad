import { Injectable } from '@nestjs/common';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantContext } from '../../common/tenant/tenant-context';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksRepository } from './tasks.repository';

@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly resourceScopeService: ResourceScopeService,
    private readonly auditService: AuditService,
  ) {}

  listTasks(context: TenantContext) {
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });

    return this.tasksRepository.list(context);
  }

  createTask(context: TenantContext, actor: ActorContext | undefined, dto: CreateTaskDto) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    const task = this.tasksRepository.create(context, actor, dto);
    const auditEvent = this.auditService.createAuditEventPlaceholder({
      action: 'task.created',
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId: task.id,
      resourceType: 'task',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: { task },
    });

    return { task, auditEvent };
  }

  getTask(context: TenantContext, id: string) {
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });

    return this.tasksRepository.getById(context, id);
  }

  updateTask(
    context: TenantContext,
    actor: ActorContext | undefined,
    id: string,
    dto: UpdateTaskDto,
  ) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    const task = this.tasksRepository.update(context, actor, id, dto);
    const auditEvent = this.auditService.createAuditEventPlaceholder({
      action: 'task.updated',
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId: task.id,
      resourceType: 'task',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: { task },
    });

    return { task, auditEvent };
  }
}
