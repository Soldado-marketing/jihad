import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmPipelineStatus } from '@prisma/client';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadsRepository } from './leads.repository';

@Injectable()
export class LeadsService {
  constructor(private readonly leadsRepository: LeadsRepository) {}

  listLeads(tenantId: string) {
    return this.leadsRepository.list(tenantId);
  }

  createLead(tenantId: string, actorId: string, dto: CreateLeadDto) {
    return this.leadsRepository.create(tenantId, actorId, dto);
  }

  async getLead(tenantId: string, id: string) {
    const lead = await this.leadsRepository.getById(tenantId, id);
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async updateLead(tenantId: string, id: string, dto: Partial<CreateLeadDto> & { status?: CrmPipelineStatus }) {
    await this.getLead(tenantId, id);
    return this.leadsRepository.update(tenantId, id, dto);
  }

  async deleteLead(tenantId: string, id: string) {
    await this.getLead(tenantId, id);
    return this.leadsRepository.delete(tenantId, id);
  }
}
