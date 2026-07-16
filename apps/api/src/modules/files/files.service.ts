import { Injectable, NotFoundException } from '@nestjs/common';
import { FilesRepository } from './files.repository';

@Injectable()
export class FilesService {
  constructor(private readonly repo: FilesRepository) {}

  list(tenantId: string) { return this.repo.list(tenantId); }
  create(tenantId: string, actorId: string, dto: { name: string; mimeType?: string; projectId?: string; taskId?: string }) {
    return this.repo.create(tenantId, actorId, dto);
  }

  async get(tenantId: string, id: string) {
    const item = await this.repo.getById(tenantId, id);
    if (!item) throw new NotFoundException('File not found');
    return item;
  }

  async update(tenantId: string, id: string, dto: { name?: string }) {
    await this.get(tenantId, id);
    return this.repo.update(tenantId, id, dto);
  }

  async delete(tenantId: string, id: string) {
    await this.get(tenantId, id);
    return this.repo.delete(tenantId, id);
  }
}
