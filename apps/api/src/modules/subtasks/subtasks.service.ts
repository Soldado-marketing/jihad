import { Injectable, NotFoundException } from '@nestjs/common';
import { assertActiveMemberInTenant } from '../../common/tenant/tenant-references';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { SubtasksRepository } from './subtasks.repository';

@Injectable()
export class SubtasksService {
  constructor(
    private readonly repo: SubtasksRepository,
    private readonly prisma: PrismaService,
    private readonly resourceScope: ResourceScopeService,
  ) {}

  async listForTask(tenantId: string, actorId: string, taskId: string) {
    await this.requireVisibleTask(tenantId, actorId, taskId);
    return this.repo.listForTask(tenantId, taskId);
  }

  async createForTask(tenantId: string, actorId: string, taskId: string, dto: CreateSubtaskDto) {
    await this.requireVisibleTask(tenantId, actorId, taskId);
    await assertActiveMemberInTenant(this.prisma, tenantId, dto.assignedToUserId);
    return this.repo.createForTask(tenantId, actorId, taskId, dto);
  }

  async updateSubtask(tenantId: string, actorId: string, id: string, dto: UpdateSubtaskDto) {
    await this.requireVisibleSubtask(tenantId, actorId, id);
    await assertActiveMemberInTenant(this.prisma, tenantId, dto.assignedToUserId);
    return this.repo.update(tenantId, id, dto);
  }

  async deleteSubtask(tenantId: string, actorId: string, id: string) {
    await this.requireVisibleSubtask(tenantId, actorId, id);
    return this.repo.delete(tenantId, id);
  }

  /**
   * The parent task comes from the path: it must be a task of the caller's
   * tenant (or the subtask would be written into another tenant's task) and,
   * for a CONTRACTOR, one they can see.
   */
  private async requireVisibleTask(tenantId: string, actorId: string, taskId: string) {
    const scope = await this.resourceScope.resolveWorkScope(tenantId, actorId);
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, tenantId, AND: [this.resourceScope.taskWhere(scope)] },
      select: { id: true },
    });
    if (!task) throw new NotFoundException('Task not found');
  }

  private async requireVisibleSubtask(tenantId: string, actorId: string, id: string) {
    const scope = await this.resourceScope.resolveWorkScope(tenantId, actorId);
    if (!scope) return;
    const subtask = await this.prisma.subtask.findFirst({
      where: { id, tenantId, task: this.resourceScope.taskWhere(scope) },
      select: { id: true },
    });
    if (!subtask) throw new NotFoundException('Subtask not found');
  }
}
