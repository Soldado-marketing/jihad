import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantAwareRepository } from '../../common/repositories/tenant-aware.repository';
import { TenantContext } from '../../common/tenant/tenant-context';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';

export type SubtaskRecord = {
  id: string;
  tenantId: string;
  taskId: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED' | 'ARCHIVED';
  assignedToUserId?: string;
  actorId?: string;
  source: 'sprint-3-placeholder';
};

@Injectable()
export class SubtasksRepository extends TenantAwareRepository {
  listForTask(context: TenantContext, taskId: string): SubtaskRecord[] {
    const tenant = this.requireTenantContext(context);

    return [
      {
        id: 'sprint-3-subtask-placeholder',
        source: 'sprint-3-placeholder',
        status: 'TODO',
        taskId,
        tenantId: tenant.tenantId,
        title: 'Sprint 3 Subtask Placeholder',
      },
    ];
  }

  createForTask(
    context: TenantContext,
    actor: ActorContext | undefined,
    taskId: string,
    dto: CreateSubtaskDto,
  ): SubtaskRecord {
    const tenant = this.requireTenantContext(context);

    return {
      assignedToUserId: dto.assignedToUserId,
      id: randomUUID(),
      source: 'sprint-3-placeholder',
      status: 'TODO',
      taskId,
      tenantId: tenant.tenantId,
      title: dto.title,
      actorId: actor?.actorId,
    };
  }

  update(
    context: TenantContext,
    actor: ActorContext | undefined,
    id: string,
    dto: UpdateSubtaskDto,
  ): SubtaskRecord {
    const tenant = this.requireTenantContext(context);

    return {
      assignedToUserId: dto.assignedToUserId,
      id,
      source: 'sprint-3-placeholder',
      status: dto.status ?? 'TODO',
      taskId: 'sprint-3-task-placeholder',
      tenantId: tenant.tenantId,
      title: dto.title ?? 'Sprint 3 Subtask Placeholder',
      actorId: actor?.actorId,
    };
  }
}
