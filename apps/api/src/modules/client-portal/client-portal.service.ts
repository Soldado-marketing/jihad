import { ForbiddenException, Injectable } from '@nestjs/common';
import { ActorContext } from '../../common/auth/actor-context';
import { MembershipRole } from '../../common/identity/membership-role';
import { TenantContext } from '../../common/tenant/tenant-context';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { ResourceScopeService } from '../permissions/resource-scope.service';

export type ClientSafeProject = {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
};

export type ClientSafeTask = {
  id: string;
  projectId?: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED' | 'ARCHIVED';
};

type ClientVisibleResource = {
  tenantId: string;
  clientVisible: boolean;
  clientScopeKey: string;
};

@Injectable()
export class ClientPortalService {
  constructor(
    private readonly auditService: AuditService,
    private readonly resourceScopeService: ResourceScopeService,
  ) {}

  listProjects(context: TenantContext, actor: ActorContext | undefined): ClientSafeProject[] {
    const clientActor = this.requireClientActor(actor);
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });
    this.recordClientAudit(context, clientActor, 'client.portal.accessed', 'client-portal');

    const project = this.placeholderProject(context, clientActor);
    this.validateClientVisibleResource(clientActor, project);

    return [this.toClientSafeProject(project)];
  }

  getProject(
    context: TenantContext,
    actor: ActorContext | undefined,
    id: string,
  ): ClientSafeProject {
    const clientActor = this.requireClientActor(actor);
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });

    const project = { ...this.placeholderProject(context, clientActor), id };
    this.validateClientVisibleResource(clientActor, project);
    this.recordClientAudit(context, clientActor, 'client.project.viewed', 'project', id);

    return this.toClientSafeProject(project);
  }

  listTasks(context: TenantContext, actor: ActorContext | undefined): ClientSafeTask[] {
    const clientActor = this.requireClientActor(actor);
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });

    const task = this.placeholderTask(context, clientActor);
    this.validateClientVisibleResource(clientActor, task);

    return [this.toClientSafeTask(task)];
  }

  getTask(context: TenantContext, actor: ActorContext | undefined, id: string): ClientSafeTask {
    const clientActor = this.requireClientActor(actor);
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });

    const task = { ...this.placeholderTask(context, clientActor), id };
    this.validateClientVisibleResource(clientActor, task);
    this.recordClientAudit(context, clientActor, 'client.task.viewed', 'task', id);

    return this.toClientSafeTask(task);
  }

  private requireClientActor(actor: ActorContext | undefined): ActorContext {
    if (!actor || actor.role !== MembershipRole.CLIENT) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        reason: 'client_actor_required',
      });
    }

    return actor;
  }

  private validateClientVisibleResource(
    actor: ActorContext,
    resource: ClientVisibleResource,
  ): void {
    if (
      !resource.clientVisible ||
      resource.tenantId !== actor.tenantId ||
      resource.clientScopeKey !== actor.actorId
    ) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        reason: 'client_visible_scope_required',
      });
    }
  }

  private placeholderProject(context: TenantContext, actor: ActorContext) {
    return {
      clientScopeKey: actor.actorId,
      clientVisible: true,
      id: 'sprint-4-client-project-placeholder',
      name: 'Client Project Placeholder',
      status: 'ACTIVE' as const,
      tenantId: context.tenantId,
    };
  }

  private placeholderTask(context: TenantContext, actor: ActorContext) {
    return {
      clientScopeKey: actor.actorId,
      clientVisible: true,
      id: 'sprint-4-client-task-placeholder',
      projectId: 'sprint-4-client-project-placeholder',
      status: 'TODO' as const,
      tenantId: context.tenantId,
      title: 'Client Task Placeholder',
    };
  }

  private toClientSafeProject(project: ReturnType<ClientPortalService['placeholderProject']>) {
    return {
      id: project.id,
      name: project.name,
      status: project.status,
    };
  }

  private toClientSafeTask(task: ReturnType<ClientPortalService['placeholderTask']>) {
    return {
      id: task.id,
      projectId: task.projectId,
      status: task.status,
      title: task.title,
    };
  }

  private recordClientAudit(
    context: TenantContext,
    actor: ActorContext,
    action: string,
    resourceType: string,
    resourceId?: string,
  ): void {
    this.auditService.createAuditEventPlaceholder({
      action,
      actorId: actor.actorId,
      actorRole: actor.role,
      deviceId: actor.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId,
      resourceType,
      sessionId: actor.sessionId,
      tenantId: context.tenantId,
      payload: {
        clientSafe: true,
        clientScopeKey: actor.actorId,
      },
    });
  }
}
