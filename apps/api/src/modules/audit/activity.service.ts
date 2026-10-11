import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PermissionService } from '../permissions/permission.service';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { PrismaService } from '../prisma/prisma.service';

/** Resources that have an activity timeline, and the permission that reads them. */
const TIMELINE_RESOURCES = {
  project: PermissionResource.PROJECT,
  task: PermissionResource.TASK,
  file: PermissionResource.FILE,
  invoice: PermissionResource.INVOICE,
  approval: PermissionResource.APPROVAL,
} as const;

export type TimelineResource = keyof typeof TIMELINE_RESOURCES;

const MAX_EVENTS = 50;

export interface TimelineCaller {
  sub: string;
  tenantId: string;
  role: string;
}

/**
 * Activity timeline over AuditEvent (MAOS-T65).
 *
 * Three gates, all server-side:
 *  1. the caller may read the resource type (PermissionService, so a CLIENT -
 *     who reads only through the client portal - is refused: audit events
 *     are internal);
 *  2. the resource itself is visible to the caller: in their tenant, and for
 *     a CONTRACTOR inside their assigned work (otherwise 404, which reveals
 *     nothing about other tenants' ids);
 *  3. only a safe projection of each event is returned - never the payload,
 *     permission result, session or device.
 */
@Injectable()
export class ActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
    private readonly resourceScope: ResourceScopeService,
  ) {}

  async timeline(caller: TimelineCaller, resourceType: string, resourceId: string) {
    if (!(resourceType in TIMELINE_RESOURCES)) {
      throw new BadRequestException({
        code: 'UNSUPPORTED_RESOURCE',
        message: `No activity timeline for "${resourceType}".`,
      });
    }
    const type = resourceType as TimelineResource;

    const decision = await this.permissions.decide(
      { action: PermissionAction.READ, resource: TIMELINE_RESOURCES[type] },
      caller.sub,
      caller.tenantId,
      caller.role,
    );
    if (!decision.allowed) throw new ForbiddenException({ code: 'FORBIDDEN', reason: decision.reason });

    const subjects = await this.visibleSubjects(caller, type, resourceId);
    if (!subjects) throw new NotFoundException('Resource not found');

    const events = await this.prisma.auditEvent.findMany({
      where: {
        tenantId: caller.tenantId,
        OR: subjects.map((s) => ({ resourceType: s.type, resourceId: { in: s.ids } })),
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_EVENTS,
      select: {
        id: true,
        action: true,
        outcome: true,
        resourceType: true,
        createdAt: true,
        actor: { select: { id: true, displayName: true } },
      },
    });
    return { items: events };
  }

  /**
   * The audit subjects for a visible resource, or null when the caller cannot
   * see it. A file's timeline includes its versions' upload/download events.
   */
  private async visibleSubjects(
    caller: TimelineCaller,
    type: TimelineResource,
    id: string,
  ): Promise<{ type: string; ids: string[] }[] | null> {
    const { tenantId } = caller;
    const scope = await this.resourceScope.resolveWorkScope(tenantId, caller.sub);

    switch (type) {
      case 'project': {
        const row = await this.prisma.project.findFirst({
          where: { id, tenantId, AND: [this.resourceScope.projectWhere(scope)] },
          select: { id: true },
        });
        return row ? [{ type: 'project', ids: [id] }] : null;
      }
      case 'task': {
        const row = await this.prisma.task.findFirst({
          where: { id, tenantId, AND: [this.resourceScope.taskWhere(scope)] },
          select: { id: true },
        });
        return row ? [{ type: 'task', ids: [id] }] : null;
      }
      case 'file': {
        const row = await this.prisma.fileAsset.findFirst({
          where: { id, tenantId, AND: [this.resourceScope.fileWhere(scope)] },
          select: { id: true, versions: { select: { id: true } } },
        });
        if (!row) return null;
        return [
          { type: 'file', ids: [id] },
          { type: 'file-version', ids: row.versions.map((v) => v.id) },
        ];
      }
      case 'invoice': {
        const row = await this.prisma.invoice.findFirst({ where: { id, tenantId }, select: { id: true } });
        return row ? [{ type: 'invoice', ids: [id] }] : null;
      }
      case 'approval': {
        const row = await this.prisma.approvalRequest.findFirst({ where: { id, tenantId }, select: { id: true } });
        return row ? [{ type: 'approval', ids: [id] }] : null;
      }
    }
  }
}
