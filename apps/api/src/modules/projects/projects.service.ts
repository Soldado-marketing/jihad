import { Injectable } from '@nestjs/common';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantContext } from '../../common/tenant/tenant-context';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsRepository } from './projects.repository';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly resourceScopeService: ResourceScopeService,
    private readonly auditService: AuditService,
  ) {}

  listProjects(context: TenantContext) {
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });

    return this.projectsRepository.list(context);
  }

  createProject(context: TenantContext, actor: ActorContext | undefined, dto: CreateProjectDto) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    const project = this.projectsRepository.create(context, actor, dto);
    const auditEvent = this.auditService.createAuditEventPlaceholder({
      action: 'project.created',
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId: project.id,
      resourceType: 'project',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: { project },
    });

    return { project, auditEvent };
  }

  getProject(context: TenantContext, id: string) {
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });

    return this.projectsRepository.getById(context, id);
  }

  updateProject(
    context: TenantContext,
    actor: ActorContext | undefined,
    id: string,
    dto: UpdateProjectDto,
  ) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    const project = this.projectsRepository.update(context, actor, id, dto);
    const auditEvent = this.auditService.createAuditEventPlaceholder({
      action: 'project.updated',
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId: project.id,
      resourceType: 'project',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: { project },
    });

    return { project, auditEvent };
  }
}
