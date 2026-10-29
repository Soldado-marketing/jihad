import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
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
    const projectChanged = dto.projectId !== undefined && dto.projectId !== before.projectId;
    const task = await this.tasksRepository.update(tenantId, id, dto, projectChanged && before.listId !== null);
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

  /**
   * Bulk order, optionally moving cards into a board list. A list must be an
   * active list of the card's own project in this tenant (the database also
   * enforces tenant and project); a list mapped to a status gives the card
   * that status. The scope check covers every card in the payload.
   */
  async reorderTasks(tenantId: string, actorId: string, dto: ReorderTasksDto) {
    const scope = await this.resourceScope.resolveWorkScope(tenantId, actorId);
    const taskScope = this.resourceScope.taskWhere(scope);
    const moving = dto.items.filter((i) => i.listId !== undefined);
    if (moving.length === 0) return this.tasksRepository.reorder(tenantId, dto.items, taskScope);

    const [tasks, lists] = await Promise.all([
      this.prisma.task.findMany({
        where: { tenantId, id: { in: moving.map((i) => i.id) }, AND: [taskScope] },
        select: { id: true, projectId: true, status: true, listId: true },
      }),
      this.prisma.taskList.findMany({
        where: { tenantId, archivedAt: null, id: { in: moving.map((i) => i.listId as string) } },
        select: { id: true, projectId: true, status: true },
      }),
    ]);
    const taskById = new Map(tasks.map((t) => [t.id, t]));
    const listById = new Map(lists.map((l) => [l.id, l]));
    const items = dto.items.map((item) => {
      if (item.listId === undefined) return item;
      const task = taskById.get(item.id);
      const list = listById.get(item.listId);
      if (!task) throw new NotFoundException('One or more task IDs not found in this tenant');
      if (!list) throw new NotFoundException('List not found');
      if (task.projectId !== list.projectId) throw new BadRequestException('A card can only move to a list of its own project');
      return { ...item, status: item.status ?? list.status ?? undefined };
    });

    const updated = await this.tasksRepository.reorder(tenantId, items, taskScope);
    for (const item of items) {
      const before = taskById.get(item.id);
      if (!before || item.listId === undefined) continue;
      if (before.listId !== item.listId) await this.recordAudit(tenantId, actorId, 'task.list.changed', item.id);
      if (item.status !== undefined && item.status !== before.status) {
        await this.recordAudit(tenantId, actorId, 'task.status.changed', item.id, { from: before.status, to: item.status });
      }
    }
    return updated;
  }
}
