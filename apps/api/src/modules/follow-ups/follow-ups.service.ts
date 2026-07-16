import { Injectable, NotFoundException } from '@nestjs/common';
import { FollowUpStatus } from '@prisma/client';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { FollowUpsRepository } from './follow-ups.repository';

@Injectable()
export class FollowUpsService {
  constructor(private readonly repo: FollowUpsRepository) {}

  list(tenantId: string) { return this.repo.list(tenantId); }
  create(tenantId: string, actorId: string, dto: CreateFollowUpDto) { return this.repo.create(tenantId, actorId, dto); }

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