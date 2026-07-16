import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { ReorderTasksDto } from './dto/reorder-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ListTaskFilters, TasksRepository } from './tasks.repository';

@Injectable()
export class TasksService {
  constructor(private readonly tasksRepository: TasksRepository) {}

  listTasks(tenantId: string, filters: ListTaskFilters = {}) {
    return this.tasksRepository.list(tenantId, filters);
  }

  createTask(tenantId: string, actorId: string, dto: CreateTaskDto) {
    return this.tasksRepository.create(tenantId, actorId, dto);
  }

  async getTask(tenantId: string, id: string) {
    const task = await this.tasksRepository.getById(tenantId, id);
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async updateTask(tenantId: string, _actorId: string, id: string, dto: UpdateTaskDto) {
    await this.getTask(tenantId, id);
    return this.tasksRepository.update(tenantId, id, dto);
  }

  async deleteTask(tenantId: string, id: string) {
    await this.getTask(tenantId, id);
    return this.tasksRepository.delete(tenantId, id);
  }

  reorderTasks(tenantId: string, dto: ReorderTasksDto) {
    return this.tasksRepository.reorder(tenantId, dto.items);
  }
}
