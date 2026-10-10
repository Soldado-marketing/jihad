import { Injectable, NotFoundException } from '@nestjs/common';
import { MeetingStatus } from '@prisma/client';
import { assertLeadInTenant, assertOpportunityInTenant } from '../../common/tenant/tenant-references';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { MeetingsRepository } from './meetings.repository';

@Injectable()
export class MeetingsService {
  constructor(
    private readonly repo: MeetingsRepository,
    private readonly prisma: PrismaService,
  ) {}

  list(tenantId: string) { return this.repo.list(tenantId); }
  async create(tenantId: string, actorId: string, dto: CreateMeetingDto) {
    await assertLeadInTenant(this.prisma, tenantId, dto.leadId);
    await assertOpportunityInTenant(this.prisma, tenantId, dto.opportunityId);
    return this.repo.create(tenantId, actorId, dto);
  }

  async get(tenantId: string, id: string) {
    const item = await this.repo.getById(tenantId, id);
    if (!item) throw new NotFoundException('Meeting not found');
    return item;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateMeetingDto> & { status?: MeetingStatus }) {
    await this.get(tenantId, id);
    return this.repo.update(tenantId, id, dto);
  }

  async delete(tenantId: string, id: string) {
    await this.get(tenantId, id);
    return this.repo.delete(tenantId, id);
  }
}
