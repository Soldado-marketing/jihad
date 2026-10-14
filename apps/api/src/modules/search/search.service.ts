import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PermissionService } from '../permissions/permission.service';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { PrismaService } from '../prisma/prisma.service';

export const SEARCH_TYPES = ['customers', 'projects', 'tasks', 'files'] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

const TYPE_PERMISSION: Record<SearchType, PermissionResource> = {
  customers: PermissionResource.CUSTOMER,
  projects: PermissionResource.PROJECT,
  tasks: PermissionResource.TASK,
  files: PermissionResource.FILE,
};

export const MIN_QUERY = 2;
export const MAX_QUERY = 100;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 25;

export interface SearchCaller {
  sub: string;
  tenantId: string;
  role: string;
}

/**
 * Global search (MAOS-T63; Blueprint "global search across Customers,
 * Projects, Tasks, Files"). A type is searched only when the caller's live
 * permissions allow reading it, and with the same work scope the list
 * endpoints use (a contractor finds only assigned projects, tasks and files).
 * Every query is bound to the caller's tenant; results carry identifiers and
 * titles only, never content. CLIENT members are refused: the portal has its
 * own, client-scoped views.
 */
@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
    private readonly resourceScope: ResourceScopeService,
  ) {}

  async search(caller: SearchCaller, qRaw: string | undefined, typesRaw: string | undefined, limitRaw: string | undefined) {
    const q = (qRaw ?? '').trim();
    if (q.length < MIN_QUERY || q.length > MAX_QUERY) {
      throw new BadRequestException({ code: 'INVALID_QUERY', message: `Search for ${MIN_QUERY} to ${MAX_QUERY} characters.` });
    }
    const requested = typesRaw ? typesRaw.split(',').map((t) => t.trim()).filter(Boolean) : [...SEARCH_TYPES];
    const unknown = requested.filter((t) => !(SEARCH_TYPES as readonly string[]).includes(t));
    if (unknown.length) throw new BadRequestException({ code: 'UNKNOWN_TYPE', message: `Unknown type: ${unknown.join(', ')}` });
    const limit = limitRaw === undefined ? DEFAULT_LIMIT : Number(limitRaw);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      throw new BadRequestException({ code: 'INVALID_LIMIT', message: `limit must be 1 to ${MAX_LIMIT}.` });
    }

    const can = async (type: SearchType) =>
      (await this.permissions.decide({ action: PermissionAction.READ, resource: TYPE_PERMISSION[type] }, caller.sub, caller.tenantId, caller.role)).allowed;
    // Workspace search needs at least task read, which every internal role has and CLIENT does not.
    if (!(await can('tasks'))) throw new ForbiddenException({ code: 'FORBIDDEN', reason: 'search_internal_only' });

    const allowed: SearchType[] = [];
    for (const t of requested as SearchType[]) if (await can(t)) allowed.push(t);

    const { tenantId } = caller;
    const scope = await this.resourceScope.resolveWorkScope(tenantId, caller.sub);
    const text = { contains: q, mode: 'insensitive' as const };
    const results: Partial<Record<SearchType, unknown[]>> = {};

    if (allowed.includes('customers')) {
      results.customers = await this.prisma.customer.findMany({
        where: { tenantId, OR: [{ name: text }, { clientScopeKey: text }, { industry: text }] },
        orderBy: { name: 'asc' },
        take: limit,
        select: { id: true, name: true, status: true },
      });
    }
    if (allowed.includes('projects')) {
      results.projects = await this.prisma.project.findMany({
        where: { tenantId, name: text, AND: [this.resourceScope.projectWhere(scope)] },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        select: { id: true, name: true, status: true },
      });
    }
    if (allowed.includes('tasks')) {
      results.tasks = await this.prisma.task.findMany({
        where: { tenantId, title: text, AND: [this.resourceScope.taskWhere(scope)] },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        select: { id: true, title: true, status: true, projectId: true },
      });
    }
    if (allowed.includes('files')) {
      results.files = await this.prisma.fileAsset.findMany({
        where: { tenantId, name: text, AND: [this.resourceScope.fileWhere(scope)] },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        select: { id: true, name: true, projectId: true },
      });
    }
    return { q, types: allowed, results };
  }
}
