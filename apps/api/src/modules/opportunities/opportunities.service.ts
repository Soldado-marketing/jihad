import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmPipelineStatus } from '@prisma/client';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { OpportunitiesRepository } from './opportunities.repository';

@Injectable()
export class OpportunitiesService {
  constructor(private readonly repo: OpportunitiesRepository) {}

  list(tenantId: string) { return this.repo.list(tenantId); }
  create(tenantId: string, actorId: string, dto: CreateOpportunityDto) { return this.repo.create(tenantId, actorId, dto); }

  async get(tenantId: string, id: string) {
    const item = await this.repo.getById(tenantId, id);
    if (!item) throw new NotFoundException('Opportunity not found');
    return item;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateOpportunityDto> & { status?: CrmPipelineStatus }) {
    await this.get(tenantId, id);
    return this.repo.update(tenantId, id, dto);
  }

  async delete(tenantId: string, id: string) {
    await this.get(tenantId, id);
    return this.repo.delete(tenantId, id);
  }
}