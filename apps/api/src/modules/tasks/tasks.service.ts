import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { CreateTaskDto } from './dto/create-task.dto';
import { ReorderTasksDto } from './dto/reorder-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { assertActiveMemberInTenant, assertProjectInTenant } from '../../common/tenant/tenant-references';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListTaskFilters, TasksRepository } from './tasks.repository';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly prisma: PrismaService,
    private readonly resourceScope: ResourceScopeService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  /** A CONTRACTOR sees only tasks assigned to them or in their member projects. */
  async listTasks(tenantId: string, actorId: string, filters: ListTaskFilters = {}) {
    const scope = await this.resourceScope.resolveWorkScope(tenantId, actorId);
    return this.tasksRepository.list(tenantId, filters, this.resourceScope.taskWhere(scope));
  }

  async createTask(tenantId: string, actorId: string, dto: CreateTaskDto) {
    await this.assertReferences(tenantId, dto);
    const scope = await this.resourceScope.resolveWorkScope(tenantId, actorId);
    this.resourceScope.assertMayUseProject(scope, dto.projectId);
    const task = await this.tasksRepository.create(tenantId, actorId, dto);
    await this.recordAudit(tenantId, actorId, 'task.created', task.id);
    await this.notifyAssignee(tenantId, actorId, task.id, task.title, dto.assignedToUserId);
    return task;
  }

  async getTask(tenantId: string, id: string, actorId: string) {
    const scope = await this.resourceScope.resolveWorkScope(tenantId, actorId);
    const task = await this.tasksRepository.getById(tenantId, id, this.resourceScope.taskWhere(scope));
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async updateTask(tenantId: string, actorId: string, id: string, dto: UpdateTaskDto) {
    const before = await this.getTask(tenantId, id, actorId);
    await this.assertReferences(tenantId, dto);
    this.resourceScope.assertMayUseProject(await this.resourceScope.resolveWorkScope(tenantId, actorId), dto.projectId);
    const task = await this.tasksRepository.update(tenantId, id, dto);
    await this.recordUpdate(tenantId, actorId, before, dto);

    // Only a CHANGE of assignee is an assignment. Re-saving a task with the
    // same assignee must not notify them again.
    if (dto.assignedToUserId !== undefined && dto.assignedToUserId !== before.assignedToUserId) {
      await this.notifyAssignee(tenantId, actorId, id, task.title, dto.assignedToUserId);
    }

    return task;
  }

  /**
   * Tells someone a task is theirs. Internal-only: a CLIENT is never told
   * about internal work, and the audience filter enforces that rather than
   * trusting the id. Keyed on task and assignee, so re-assigning back and
   * forth notifies each assignee once per task.
   */
  private async notifyAssignee(
    tenantId: string,
    actorId: string,
    taskId: string,
    title: string,
    assigneeId?: string | null,
  ): Promise<void> {
    if (!assigneeId) return;

    await this.notifications.notify({
      tenantId,
      recipientUserIds: [assigneeId],
      audience: 'INTERNAL',
      actorUserId: actorId,
      dedupeKey: `task.assigned:${taskId}:${assigneeId}`,
      title: 'Task assigned to you',
      body: title,
      resourceType: 'task',
      resourceId: taskId,
    });
  }

  /** Body references (project, assignee) must belong to the caller's tenant. */
  private async assertReferences(
    tenantId: string,
    dto: { projectId?: string | null; assignedToUserId?: string | null },
  ) {
    await assertProjectInTenant(this.prisma, tenantId, dto.projectId);
    await assertActiveMemberInTenant(this.prisma, tenantId, dto.assignedToUserId);
  }

  async deleteTask(tenantId: string, id: string, actorId: string) {
    await this.getTask(tenantId, id, actorId);
    const deleted = await this.tasksRepository.delete(tenantId, id);
    await this.recordAudit(tenantId, actorId, 'task.deleted', id);
    return deleted;
  }

  /**
   * Card history (activity timeline). A status move is its own event; other
   * edits record which fields changed, never their values (titles and
   * descriptions can be confidential).
   */
  private async recordUpdate(
    tenantId: string,
    actorId: string,
    before: { id: string; status: string; assignedToUserId: string | null },
    dto: UpdateTaskDto,
  ) {
    if (dto.status !== undefined && dto.status !== before.status) {
      await this.recordAudit(tenantId, actorId, 'task.status.changed', before.id, { from: before.status, to: dto.status });
    }
    if (dto.assignedToUserId !== undefined && dto.assignedToUserId !== before.assignedToUserId) {
      await this.recordAudit(tenantId, actorId, 'task.assigned', before.id);
    }
    const fields = Object.entries(dto)
      .filter(([k, v]) => v !== undefined && k !== 'status' && k !== 'assignedToUserId')
      .map(([k]) => k);
    if (fields.length > 0) await this.recordAudit(tenantId, actorId, 'task.updated', before.id, { fields });
  }

  private async recordAudit(tenantId: string, actorId: string, action: string, resourceId: string, payload?: Record<string, unknown>) {
    try {
      await this.audit.createAuditEvent({
        tenantId,
        actorId,
        resourceType: 'task',
        resourceId,
        action,
        permissionResult: AuditPermissionResult.ALLOWED,
        outcome: AuditOutcome.SUCCESS,
        payload,
      });
    } catch {
      this.logger.warn(`audit_write_failed action=${action}`);
    }
  }

  async reorderTasks(tenantId: string, actorId: string, dto: ReorderTasksDto) {
    const scope = await this.resourceScope.resolveWorkScope(tenantId, actorId);
    return this.tasksRepository.reorder(tenantId, dto.items, this.resourceScope.taskWhere(scope));
  }
}
