import { Injectable, NotFoundException } from '@nestjs/common';
import { FollowUpStatus } from '@prisma/client';
import { assertLeadInTenant, assertOpportunityInTenant } from '../../common/tenant/tenant-references';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { FollowUpsRepository } from './follow-ups.repository';

@Injectable()
export class FollowUpsService {
  constructor(
    private readonly repo: FollowUpsRepository,
    private readonly prisma: PrismaService,
  ) {}

  list(tenantId: string) { return this.repo.list(tenantId); }
  async create(tenantId: string, actorId: string, dto: CreateFollowUpDto) {
    await assertLeadInTenant(this.prisma, tenantId, dto.leadId);
    await assertOpportunityInTenant(this.prisma, tenantId, dto.opportunityId);
    return this.repo.create(tenantId, actorId, dto);
  }

  async get(tenantId: string, id: string) {
    const item = await this.repo.getById(tenantId, id);
    if (!item) throw new NotFoundException('Follow-up not found');
    return item;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateFollowUpDto> & { status?: FollowUpStatus }) {
    await this.get(tenantId, id);
    return this.repo.update(tenantId, id, dto);
  }

  async delete(tenantId: string, id: string) {
    await this.get(tenantId, id);
    return this.repo.delete(tenantId, id);
  }
}