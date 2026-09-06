import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { ReorderTasksDto } from './dto/reorder-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ListTaskFilters, TasksRepository } from './tasks.repository';

@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly notifications: NotificationsService,
  ) {}

  listTasks(tenantId: string, filters: ListTaskFilters = {}) {
    return this.tasksRepository.list(tenantId, filters);
  }

  async createTask(tenantId: string, actorId: string, dto: CreateTaskDto) {
    const task = await this.tasksRepository.create(tenantId, actorId, dto);
    await this.notifyAssignee(tenantId, actorId, task.id, task.title, dto.assignedToUserId);
    return task;
  }

  async getTask(tenantId: string, id: string) {
    const task = await this.tasksRepository.getById(tenantId, id);
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async updateTask(tenantId: string, actorId: string, id: string, dto: UpdateTaskDto) {
    const before = await this.getTask(tenantId, id);
    const task = await this.tasksRepository.update(tenantId, id, dto);

    // Only a CHANGE of assignee is an assignment. Re-saving a task with the
    // same assignee must not notify them again.
    if (dto.assignedToUserId !== undefined && dto.assignedToUserId !== before.assignedToUserId) {
      await this.notifyAssignee(tenantId, actorId, id, task.title, dto.assignedToUserId);
    }

    return task;
  }

  /**
   * Tells someone a task is theirs. Internal-only: a CLIENT is never assigned
   * work, and the audience filter enforces that rather than trusting the id.
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

  async deleteTask(tenantId: string, id: string) {
    await this.getTask(tenantId, id);
    return this.tasksRepository.delete(tenantId, id);
  }

  reorderTasks(tenantId: string, dto: ReorderTasksDto) {
    return this.tasksRepository.reorder(tenantId, dto.items);
  }
}
