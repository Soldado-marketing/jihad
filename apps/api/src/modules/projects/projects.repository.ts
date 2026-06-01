import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantAwareRepository } from '../../common/repositories/tenant-aware.repository';
import { TenantContext } from '../../common/tenant/tenant-context';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

export type ProjectRecord = {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  actorId?: string;
  source: 'sprint-3-placeholder';
};

@Injectable()
export class ProjectsRepository extends TenantAwareRepository {
  list(context: TenantContext): ProjectRecord[] {
    const tenant = this.requireTenantContext(context);

    return [
      {
        id: 'sprint-3-project-placeholder',
        name: 'Sprint 3 Project Placeholder',
        source: 'sprint-3-placeholder',
        status: 'ACTIVE',
        tenantId: tenant.tenantId,
      },
    ];
  }

  create(
    context: TenantContext,
    actor: ActorContext | undefined,
    dto: CreateProjectDto,
  ): ProjectRecord {
    const tenant = this.requireTenantContext(context);

    return {
      description: dto.description,
      id: randomUUID(),
      name: dto.name,
      source: 'sprint-3-placeholder',
      status: 'ACTIVE',
      tenantId: tenant.tenantId,
      actorId: actor?.actorId,
    };
  }

  getById(context: TenantContext, id: string): ProjectRecord {
    const tenant = this.requireTenantContext(context);

    return {
      id,
      name: 'Sprint 3 Project Placeholder',
      source: 'sprint-3-placeholder',
      status: 'ACTIVE',
      tenantId: tenant.tenantId,
    };
  }

  update(
    context: TenantContext,
    actor: ActorContext | undefined,
    id: string,
    dto: UpdateProjectDto,
  ): ProjectRecord {
    const tenant = this.requireTenantContext(context);

    return {
      description: dto.description,
      id,
      name: dto.name ?? 'Sprint 3 Project Placeholder',
      source: 'sprint-3-placeholder',
      status: dto.status ?? 'ACTIVE',
      tenantId: tenant.tenantId,
      actorId: actor?.actorId,
    };
  }
}
