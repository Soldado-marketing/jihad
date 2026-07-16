import { Injectable } from '@nestjs/common';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { SubtasksRepository } from './subtasks.repository';

@Injectable()
export class SubtasksService {
  constructor(private readonly repo: SubtasksRepository) {}

  listForTask(tenantId: string, taskId: string) {
    return this.repo.listForTask(tenantId, taskId);
  }

  createForTask(tenantId: string, actorId: string, taskId: string, dto: CreateSubtaskDto) {
    return this.repo.createForTask(tenantId, actorId, taskId, dto);
  }

  updateSubtask(tenantId: string, actorId: string, id: string, dto: UpdateSubtaskDto) {
    return this.repo.update(tenantId, id, dto);
  }

  deleteSubtask(tenantId: string, id: string) {
    return this.repo.delete(tenantId, id);
  }
}
