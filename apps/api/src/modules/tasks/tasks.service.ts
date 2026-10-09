import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { ReorderTasksDto } from './dto/reorder-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { assertActiveMemberInTenant, assertProjectInTenant } from '../../common/tenant/tenant-references';
import { PrismaService } from '../prisma/prisma.service';
import { ListTaskFilters, TasksRepository } from './tasks.repository';

@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly prisma: PrismaService,
  ) {}

  listTasks(tenantId: string, filters: ListTaskFilters = {}) {
    return this.tasksRepository.list(tenantId, filters);
  }

  async createTask(tenantId: string, actorId: string, dto: CreateTaskDto) {
    await this.assertReferences(tenantId, dto);
    return this.tasksRepository.create(tenantId, actorId, dto);
  }

  async getTask(tenantId: string, id: string) {
    const task = await this.tasksRepository.getById(tenantId, id);
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async updateTask(tenantId: string, _actorId: string, id: string, dto: UpdateTaskDto) {
    await this.getTask(tenantId, id);
    await this.assertReferences(tenantId, dto);
    return this.tasksRepository.update(tenantId, id, dto);
  }

  /** Body references (project, assignee) must belong to the caller's tenant. */
  private async assertReferences(
    tenantId: string,
    dto: { projectId?: string | null; assignedToUserId?: string | null },
  ) {
    await assertProjectInTenant(this.prisma, tenantId, dto.projectId);
    await assertActiveMemberInTenant(this.prisma, tenantId, dto.assignedToUserId);
  }

  async deleteTask(tenantId: string, id: string) {
    await this.getTask(tenantId, id);
    return this.tasksRepository.delete(tenantId, id);
  }

  reorderTasks(tenantId: string, dto: ReorderTasksDto) {
    return this.tasksRepository.reorder(tenantId, dto.items);
  }
}
