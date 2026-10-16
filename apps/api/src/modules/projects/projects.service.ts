import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { ProjectsRepository, ProjectWrite } from './projects.repository';

export interface Progress {
  done: number;
  total: number;
  /** Whole percent of non-archived tasks that are DONE; null without tasks. */
  percent: number | null;
}

/** Progress from task statuses (Blueprint §11: derived, never typed in). Archived tasks do not count. */
export function progressFrom(counts: ReadonlyArray<{ status: string; count: number }>): Progress {
  let done = 0;
  let total = 0;
  for (const c of counts) {
    if (c.status === 'ARCHIVED') continue;
    total += c.count;
    if (c.status === 'DONE') done += c.count;
  }
  return { done, total, percent: total === 0 ? null : Math.round((done / total) * 100) };
}

const isUnique = (err: unknown, field: string) =>
  (err as { code?: unknown } | null)?.code === 'P2002' &&
  JSON.stringify((err as { meta?: unknown }).meta ?? {}).includes(field);

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly resourceScope: ResourceScopeService,
  ) {}

  /** A CONTRACTOR sees only assigned projects, and only their visible tasks in them. */
  async listProjects(tenantId: string, actorId: string) {
    const scope = await this.resourceScope.resolveWorkScope(tenantId, actorId);
    const taskScope = this.resourceScope.taskWhere(scope);
    const rows = await this.projectsRepository.list(tenantId, this.resourceScope.projectWhere(scope), taskScope);
    const progress = await this.progressByProject(tenantId, rows.map((r) => r.id), taskScope);
    const owner = await this.isOwner(tenantId, actorId);
    return rows.map((r) => this.present({ ...r, progress: progress.get(r.id) ?? progressFrom([]) }, owner));
  }

  async createProject(tenantId: string, actorId: string, dto: CreateProjectDto) {
    const owner = await this.isOwner(tenantId, actorId);
    if (dto.budgetCents !== undefined && !owner) this.budgetOwnerOnly();
    const data: Omit<Prisma.ProjectUncheckedCreateInput, 'tenantId'> = {
      name: dto.name,
      description: dto.description,
      serviceType: dto.serviceType?.trim() || undefined,
      budgetCents: dto.budgetCents,
      deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      ownerUserId: dto.ownerUserId ? await this.checkOwnerUser(tenantId, dto.ownerUserId) : undefined,
      ...(dto.customerId ? await this.customerLink(tenantId, dto.customerId) : {}),
    };

    let id: string;
    if (dto.projectNumber) {
      try {
        ({ id } = await this.projectsRepository.create(tenantId, { ...data, projectNumber: dto.projectNumber }));
      } catch (err) {
        if (isUnique(err, 'projectNumber')) this.numberTaken();
        throw err;
      }
    } else {
      // Next automatic number; a concurrent create may take it, so retry.
      for (let attempt = 0; ; attempt += 1) {
        const next = `P-${String((await this.projectsRepository.maxAutoNumber(tenantId)) + 1).padStart(4, '0')}`;
        try {
          ({ id } = await this.projectsRepository.create(tenantId, { ...data, projectNumber: next }));
          break;
        } catch (err) {
          if (!isUnique(err, 'projectNumber') || attempt >= 4) throw err;
        }
      }
    }
    return this.getProject(tenantId, id, actorId);
  }

  async getProject(tenantId: string, id: string, actorId: string) {
    const scope = await this.resourceScope.resolveWorkScope(tenantId, actorId);
    const taskScope = this.resourceScope.taskWhere(scope);
    const project = await this.projectsRepository.getById(tenantId, id, this.resourceScope.projectWhere(scope), taskScope);
    if (!project) throw new NotFoundException('Project not found');
    const progress = (await this.progressByProject(tenantId, [id], taskScope)).get(id) ?? progressFrom([]);
    return this.present({ ...project, progress }, await this.isOwner(tenantId, actorId));
  }

  async updateProject(tenantId: string, actorId: string, id: string, dto: UpdateProjectDto) {
    await this.getProject(tenantId, id, actorId);
    const owner = await this.isOwner(tenantId, actorId);
    if (dto.budgetCents !== undefined && !owner) this.budgetOwnerOnly();
    const data: ProjectWrite = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.clientVisible !== undefined && { clientVisible: dto.clientVisible }),
      ...(dto.serviceType !== undefined && { serviceType: dto.serviceType?.trim() || null }),
      ...(dto.budgetCents !== undefined && { budgetCents: dto.budgetCents }),
      ...(dto.deadline !== undefined && { deadline: dto.deadline ? new Date(dto.deadline) : null }),
      ...(dto.projectNumber !== undefined && { projectNumber: dto.projectNumber }),
    };
    if (dto.ownerUserId !== undefined) {
      data.ownerUserId = dto.ownerUserId === null ? null : await this.checkOwnerUser(tenantId, dto.ownerUserId);
    }
    if (dto.customerId !== undefined) {
      Object.assign(data, dto.customerId === null ? { customerId: null, clientScopeKey: null } : await this.customerLink(tenantId, dto.customerId));
    }
    try {
      await this.projectsRepository.update(tenantId, id, data);
    } catch (err) {
      if (isUnique(err, 'projectNumber')) this.numberTaken();
      throw err;
    }
    return this.getProject(tenantId, id, actorId);
  }

  async deleteProject(tenantId: string, id: string, actorId: string) {
    await this.getProject(tenantId, id, actorId);
    try {
      return await this.projectsRepository.delete(tenantId, id);
    } catch (err) {
      // TimeEntry.projectId is NO ACTION (T71): logged time is cost history and keeps its project.
      if ((err as { code?: unknown } | null)?.code === 'P2003') {
        throw new ConflictException({ code: 'PROJECT_HAS_TIME_ENTRIES', message: 'This project has logged time and cannot be deleted. Archive it instead.' });
      }
      throw err;
    }
  }

  /** budgetCents is finance data: OWNER only (Blueprint §6). */
  private present<T extends { budgetCents?: number | null }>(project: T, owner: boolean): T {
    if (owner) return project;
    const { budgetCents: _hidden, ...rest } = project;
    return rest as T;
  }

  private async progressByProject(tenantId: string, ids: string[], taskScope: Prisma.TaskWhereInput) {
    const rows = await this.projectsRepository.taskStatusCounts(tenantId, ids, taskScope);
    const byProject = new Map<string, { status: string; count: number }[]>();
    for (const r of rows) {
      if (!r.projectId) continue;
      const list = byProject.get(r.projectId) ?? [];
      list.push({ status: r.status, count: r._count._all });
      byProject.set(r.projectId, list);
    }
    return new Map([...byProject].map(([k, v]) => [k, progressFrom(v)]));
  }

  /** From the database membership, never the token. */
  private async isOwner(tenantId: string, userId: string): Promise<boolean> {
    const m = await this.projectsRepository.membership(tenantId, userId);
    return m?.role === 'OWNER' && m.status === 'ACTIVE';
  }

  /** The responsible person must be an ACTIVE internal member of this tenant. */
  private async checkOwnerUser(tenantId: string, userId: string): Promise<string> {
    const m = await this.projectsRepository.membership(tenantId, userId);
    if (!m || m.status !== 'ACTIVE' || m.role === 'CLIENT') {
      throw new BadRequestException({ code: 'PROJECT_OWNER_INVALID', message: 'The responsible person must be an active team member.' });
    }
    return userId;
  }

  /**
   * ADR-017: a project belongs to a customer through the customer's client key,
   * so both are set together and can never disagree. Archived customers and
   * customers of other tenants are refused.
   */
  private async customerLink(tenantId: string, customerId: string) {
    const c = await this.projectsRepository.customer(tenantId, customerId);
    if (!c || c.status === 'ARCHIVED') {
      throw new BadRequestException({ code: 'PROJECT_CUSTOMER_INVALID', message: 'Choose an active customer of this workspace.' });
    }
    return { customerId: c.id, clientScopeKey: c.clientScopeKey };
  }

  private budgetOwnerOnly(): never {
    throw new ForbiddenException({ code: 'PROJECT_BUDGET_OWNER_ONLY', message: 'Only the owner can set a project budget.' });
  }

  private numberTaken(): never {
    throw new ConflictException({ code: 'PROJECT_NUMBER_TAKEN', message: 'This project number is already used in this workspace.' });
  }
}
