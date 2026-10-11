import { Injectable, NotFoundException } from '@nestjs/common';
import { assertProjectInTenant, assertTaskInTenant } from '../../common/tenant/tenant-references';
import { PrismaService } from '../prisma/prisma.service';
import { VoiceNotesRepository } from './voice-notes.repository';

@Injectable()
export class VoiceNotesService {
  constructor(
    private readonly repo: VoiceNotesRepository,
    private readonly prisma: PrismaService,
  ) {}

  list(tenantId: string) { return this.repo.list(tenantId); }
  async create(tenantId: string, actorId: string, title: string, projectId?: string, taskId?: string) {
    await assertProjectInTenant(this.prisma, tenantId, projectId);
    await assertTaskInTenant(this.prisma, tenantId, taskId);
    return this.repo.create(tenantId, actorId, title, projectId, taskId);
  }
  async get(tenantId: string, id: string) {
    const item = await this.repo.getById(tenantId, id);
    if (!item) throw new NotFoundException('Voice note not found');
    return item;
  }
  async delete(tenantId: string, id: string) {
    await this.get(tenantId, id);
    return this.repo.delete(tenantId, id);
  }
}
