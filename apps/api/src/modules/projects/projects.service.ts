import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { ProjectsRepository } from './projects.repository';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly resourceScope: ResourceScopeService,
  ) {}

  /** A CONTRACTOR sees only assigned projects, and only their visible tasks in them. */
  async listProjects(tenantId: string, actorId: string) {
    const scope = await this.resourceScope.resolveWorkScope(tenantId, actorId);
    return this.projectsRepository.list(
      tenantId,
      this.resourceScope.projectWhere(scope),
      this.resourceScope.taskWhere(scope),
    );
  }

  createProject(tenantId: string, actorId: string, dto: CreateProjectDto) {
    return this.projectsRepository.create(tenantId, actorId, dto);
  }

  async getProject(tenantId: string, id: string, actorId: string) {
    const scope = await this.resourceScope.resolveWorkScope(tenantId, actorId);
    const project = await this.projectsRepository.getById(
      tenantId,
      id,
      this.resourceScope.projectWhere(scope),
      this.resourceScope.taskWhere(scope),
    );
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async updateProject(tenantId: string, actorId: string, id: string, dto: UpdateProjectDto) {
    await this.getProject(tenantId, id, actorId);
    return this.projectsRepository.update(tenantId, id, dto);
  }

  async deleteProject(tenantId: string, id: string, actorId: string) {
    await this.getProject(tenantId, id, actorId);
    return this.projectsRepository.delete(tenantId, id);
  }
}
