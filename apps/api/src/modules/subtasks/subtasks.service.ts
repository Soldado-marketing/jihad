import { Injectable, NotFoundException } from '@nestjs/common';
import { assertActiveMemberInTenant } from '../../common/tenant/tenant-references';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { SubtasksRepository } from './subtasks.repository';

@Injectable()
export class SubtasksService {
  constructor(
    private readonly repo: SubtasksRepository,
    private readonly prisma: PrismaService,
  ) {}

  listForTask(tenantId: string, taskId: string) {
    return this.repo.listForTask(tenantId, taskId);
  }

  async createForTask(tenantId: string, actorId: string, taskId: string, dto: CreateSubtaskDto) {
    // The parent task comes from the path: it must be the caller's tenant's
    // task, or the subtask would be written into another tenant's task.
    const task = await this.prisma.task.findFirst({ where: { id: taskId, tenantId }, select: { id: true } });
    if (!task) throw new NotFoundException('Task not found');
    await assertActiveMemberInTenant(this.prisma, tenantId, dto.assignedToUserId);
    return this.repo.createForTask(tenantId, actorId, taskId, dto);
  }

  async updateSubtask(tenantId: string, actorId: string, id: string, dto: UpdateSubtaskDto) {
    await assertActiveMemberInTenant(this.prisma, tenantId, dto.assignedToUserId);
    return this.repo.update(tenantId, id, dto);
  }

  deleteSubtask(tenantId: string, id: string) {
    return this.repo.delete(tenantId, id);
  }
}
