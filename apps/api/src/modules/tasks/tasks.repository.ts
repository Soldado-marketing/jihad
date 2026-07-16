import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { ReorderItemDto } from './dto/reorder-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

export interface ListTaskFilters {
  projectId?: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED' | 'ARCHIVED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedToUserId?: string;
  labelId?: string;
}

/**
 * Returns the include clause used for full task responses (getById, update).
 * Factory function avoids readonly-array issues with Prisma's orderBy types.
 */
function taskFullInclude() {
  return {
    project: { select: { id: true, name: true } },
    assignedTo: { select: { id: true, displayName: true, email: true } },
    subtasks: {
      orderBy: [
        { sortOrder: { sort: 'asc' as const, nulls: 'last' as const } },
        { createdAt: 'asc' as const },
      ],
    },
    _count: { select: { subtasks: true } },
    labels: {
      select: {
        label: { select: { id: true, name: true, color: true } },
      },
    },
  };
}

/**
 * Returns the select clause used for task list responses.
 * Factory function for the same reason as taskFullInclude.
 */
function taskListSelect() {
  return {
    id: true,
    title: true,
    description: true,
    status: true,
    priority: true,
    sortOrder: true,
    dueAt: true,
    projectId: true,
    assignedToUserId: true,
    createdAt: true,
    updatedAt: true,
    project: { select: { id: true, name: true } },
    assignedTo: { select: { id: true, displayName: true, email: true } },
    _count: { select: { subtasks: true } },
    labels: {
      select: {
        label: { select: { id: true, name: true, color: true } },
      },
    },
  };
}

@Injectable()
export class TasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, filters: ListTaskFilters = {}) {
    return this.prisma.task.findMany({
      where: {
        tenantId,
        ...(filters.projectId ? { projectId: filters.projectId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.priority ? { priority: filters.priority } : {}),
        ...(filters.assignedToUserId ? { assignedToUserId: filters.assignedToUserId } : {}),
        ...(filters.labelId ? { labels: { some: { labelId: filters.labelId } } } : {}),
      },
      orderBy: [
        { sortOrder: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'desc' },
      ],
      select: taskListSelect(),
    });
  }

  create(tenantId: string, _actorId: string, dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        tenantId,
        title: dto.title,
        description: dto.description,
        status: dto.status,
        projectId: dto.projectId,
        assignedToUserId: dto.assignedToUserId,
        priority: dto.priority ?? 'MEDIUM',
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      },
    });
  }

  getById(tenantId: string, id: string) {
    return this.prisma.task.findFirst({
      where: { id, tenantId },
      include: taskFullInclude(),
    });
  }

  /**
   * Update a task and return the full task with all relations.
   * The caller no longer needs to reload the full task list after a single save.
   */
  update(tenantId: string, id: string, dto: UpdateTaskDto) {
    return this.prisma.task.update({
      where: { id, tenantId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.assignedToUserId !== undefined && { assignedToUserId: dto.assignedToUserId }),
        ...(dto.dueAt !== undefined && { dueAt: dto.dueAt ? new Date(dto.dueAt) : null }),
        ...(dto.projectId !== undefined && { projectId: dto.projectId }),
      },
      include: taskFullInclude(),
    });
  }

  delete(tenantId: string, id: string) {
    return this.prisma.task.delete({ where: { id, tenantId } });
  }

  /**
   * Atomic bulk reorder.
   *
   * Validates:
   *   1. No duplicate task IDs in the payload.
   *   2. Every task ID belongs to the authenticated tenant.
   *   3. Runs all updates inside a single Prisma transaction.
   *
   * Returns the updated tasks (id, status, sortOrder, updatedAt) — lightweight.
   */
  async reorder(tenantId: string, items: ReorderItemDto[]) {
    const ids = items.map(i => i.id);

    // Reject duplicates
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Duplicate task IDs in reorder payload');
    }

    // Verify all IDs belong to this tenant in a single query
    const count = await this.prisma.task.count({
      where: { tenantId, id: { in: ids } },
    });
    if (count !== ids.length) {
      throw new NotFoundException('One or more task IDs not found in this tenant');
    }

    // Execute all updates atomically
    const updates = await this.prisma.$transaction(
      items.map(item =>
        this.prisma.task.update({
          where: { id: item.id, tenantId },
          data: {
            sortOrder: item.sortOrder,
            ...(item.status !== undefined && { status: item.status }),
          },
          select: { id: true, status: true, sortOrder: true, updatedAt: true },
        }),
      ),
    );

    return updates;
  }
}
