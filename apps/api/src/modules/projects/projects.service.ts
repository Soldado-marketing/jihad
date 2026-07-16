import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsRepository } from './projects.repository';

@Injectable()
export class ProjectsService {
  constructor(private readonly projectsRepository: ProjectsRepository) {}

  listProjects(tenantId: string) {
    return this.projectsRepository.list(tenantId);
  }

  createProject(tenantId: string, actorId: string, dto: CreateProjectDto) {
    return this.projectsRepository.create(tenantId, actorId, dto);
  }

  async getProject(tenantId: string, id: string) {
    const project = await this.projectsRepository.getById(tenantId, id);
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async updateProject(tenantId: string, _actorId: string, id: string, dto: UpdateProjectDto) {
    await this.getProject(tenantId, id);
    return this.projectsRepository.update(tenantId, id, dto);
  }

  async deleteProject(tenantId: string, id: string) {
    await this.getProject(tenantId, id);
    return this.projectsRepository.delete(tenantId, id);
  }
}
