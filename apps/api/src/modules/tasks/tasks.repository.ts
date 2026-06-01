import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantAwareRepository } from '../../common/repositories/tenant-aware.repository';
import { TenantContext } from '../../common/tenant/tenant-context';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

export type TaskRecord = {
  id: string;
  tenantId: string;
  projectId?: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED' | 'ARCHIVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedToUserId?: string;
  dueAt?: string;
  actorId?: string;
  source: 'sprint-3-placeholder';
};

@Injectable()
export class TasksRepository extends TenantAwareRepository {
  list(context: TenantContext): TaskRecord[] {
    const tenant = this.requireTenantContext(context);

    return [
      {
        id: 'sprint-3-task-placeholder',
        priority: 'MEDIUM',
        source: 'sprint-3-placeholder',
        status: 'TODO',
        tenantId: tenant.tenantId,
        title: 'Sprint 3 Task Placeholder',
      },
    ];
  }

  create(context: TenantContext, actor: ActorContext | undefined, dto: CreateTaskDto): TaskRecord {
    const tenant = this.requireTenantContext(context);

    return {
      assignedToUserId: dto.assignedToUserId,
      description: dto.description,
      dueAt: dto.dueAt,
      id: randomUUID(),
      priority: dto.priority ?? 'MEDIUM',
      projectId: dto.projectId,
      source: 'sprint-3-placeholder',
      status: 'TODO',
      tenantId: tenant.tenantId,
      title: dto.title,
      actorId: actor?.actorId,
    };
  }

  getById(context: TenantContext, id: string): TaskRecord {
    const tenant = this.requireTenantContext(context);

    return {
      id,
      priority: 'MEDIUM',
      source: 'sprint-3-placeholder',
      status: 'TODO',
      tenantId: tenant.tenantId,
      title: 'Sprint 3 Task Placeholder',
    };
  }

  update(
    context: TenantContext,
    actor: ActorContext | undefined,
    id: string,
    dto: UpdateTaskDto,
  ): TaskRecord {
    const tenant = this.requireTenantContext(context);

    return {
      assignedToUserId: dto.assignedToUserId,
      description: dto.description,
      dueAt: dto.dueAt,
      id,
      priority: dto.priority ?? 'MEDIUM',
      source: 'sprint-3-placeholder',
      status: dto.status ?? 'TODO',
      tenantId: tenant.tenantId,
      title: dto.title ?? 'Sprint 3 Task Placeholder',
      actorId: actor?.actorId,
    };
  }
}
