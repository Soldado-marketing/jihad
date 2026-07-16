import { Injectable, NotFoundException } from '@nestjs/common';
import { MeetingStatus } from '@prisma/client';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { MeetingsRepository } from './meetings.repository';

@Injectable()
export class MeetingsService {
  constructor(private readonly repo: MeetingsRepository) {}

  list(tenantId: string) { return this.repo.list(tenantId); }
  create(tenantId: string, actorId: string, dto: CreateMeetingDto) { return this.repo.create(tenantId, actorId, dto); }

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
