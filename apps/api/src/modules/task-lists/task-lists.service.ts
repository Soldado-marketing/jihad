import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskListDto } from './dto/create-task-list.dto';
import { ReorderTaskListsDto } from './dto/reorder-task-lists.dto';
import { UpdateTaskListDto } from './dto/update-task-list.dto';
import { TaskListsRepository } from './task-lists.repository';

/**
 * Custom board lists per project (owner approval 2026-10-29). Every call
 * resolves the project inside the caller's tenant and work scope first, so a
 * foreign or out-of-scope project or list answers 404 and reveals nothing.
 */
@Injectable()
export class TaskListsService {
  private readonly logger = new Logger(TaskListsService.name);

  constructor(
    private readonly lists: TaskListsRepository,
    private readonly prisma: PrismaService,
    private readonly resourceScope: ResourceScopeService,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, actorId: string, projectId: string, includeArchived: boolean) {
    await this.visibleProject(tenantId, actorId, projectId);
    return this.lists.list(tenantId, projectId, includeArchived);
  }

  /** Explicit and idempotent: creates the default lists only when the project has none. */
  async initialize(tenantId: string, actorId: string, projectId: string) {
    await this.visibleProject(tenantId, actorId, projectId);
    const created = await this.lists.initialize(tenantId, projectId);
    if (created) await this.recordAudit(tenantId, actorId, 'board.initialized', projectId);
    return { created, lists: await this.lists.list(tenantId, projectId, false) };
  }

  async create(tenantId: string, actorId: string, projectId: string, dto: CreateTaskListDto) {
    await this.visibleProject(tenantId, actorId, projectId);
    const list = await this.lists.create(tenantId, projectId, this.cleanName(dto.name), dto.status);
    await this.recordAudit(tenantId, actorId, 'board.list.created', projectId);
    return list;
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateTaskListDto) {
    const list = await this.visibleList(tenantId, actorId, id);
    const data: Prisma.TaskListUpdateManyMutationInput = {};
    if (dto.name !== undefined) data.name = this.cleanName(dto.name);
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.archived !== undefined) data.archivedAt = dto.archived ? (list.archivedAt ?? new Date()) : null;
    // A restored list comes back at the end, so it never ties with a list reordered meanwhile.
    if (dto.archived === false && list.archivedAt) data.sortOrder = await this.lists.nextSortOrder(tenantId, list.projectId);
    const updated = await this.lists.update(tenantId, id, data);

    const action =
      dto.archived === true && !list.archivedAt ? 'board.list.archived'
        : dto.archived === false && list.archivedAt ? 'board.list.restored'
          : 'board.list.updated';
    await this.recordAudit(tenantId, actorId, action, list.projectId);
    return updated;
  }

  /** The payload must be exactly the project's active lists, each once. */
  async reorder(tenantId: string, actorId: string, projectId: string, dto: ReorderTaskListsDto) {
    await this.visibleProject(tenantId, actorId, projectId);
    if (new Set(dto.ids).size !== dto.ids.length) throw new BadRequestException('Duplicate list ids');
    const [matching, active] = await Promise.all([
      this.lists.countActive(tenantId, projectId, dto.ids),
      this.lists.activeCount(tenantId, projectId),
    ]);
    if (matching !== dto.ids.length) throw new NotFoundException('One or more lists not found in this project');
    if (matching !== active) throw new BadRequestException('Send every active list of the project');
    const result = await this.lists.reorder(tenantId, dto.ids);
    await this.recordAudit(tenantId, actorId, 'board.lists.reordered', projectId);
    return result;
  }

  private async visibleProject(tenantId: string, actorId: string, projectId: string) {
    const scope = await this.resourceScope.resolveWorkScope(tenantId, actorId);
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId, AND: [this.resourceScope.projectWhere(scope)] },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async visibleList(tenantId: string, actorId: string, id: string) {
    const scope = await this.resourceScope.resolveWorkScope(tenantId, actorId);
    const list = await this.lists.findInTenant(tenantId, id, this.resourceScope.projectWhere(scope));
    if (!list) throw new NotFoundException('List not found');
    return list;
  }

  private cleanName(name: string) {
    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException('List name is required');
    return trimmed;
  }

  private async recordAudit(tenantId: string, actorId: string, action: string, projectId: string) {
    try {
      await this.audit.createAuditEvent({
        tenantId,
        actorId,
        resourceType: 'project',
        resourceId: projectId,
        action,
        permissionResult: AuditPermissionResult.ALLOWED,
        outcome: AuditOutcome.SUCCESS,
      });
    } catch {
      this.logger.warn(`audit_write_failed action=${action}`);
    }
  }
}
