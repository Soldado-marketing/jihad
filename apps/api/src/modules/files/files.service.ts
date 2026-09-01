import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { FilesRepository } from './files.repository';

@Injectable()
export class FilesService {
  constructor(private readonly repo: FilesRepository) {}

  list(tenantId: string) { return this.repo.list(tenantId); }

  create(tenantId: string, actorId: string, dto: CreateFileDto) {
    return this.repo.create(tenantId, actorId, dto);
  }

  async get(tenantId: string, id: string) {
    const item = await this.repo.getById(tenantId, id);
    // Rows from another tenant are simply not found by the scoped query, so a
    // caller cannot use this route to probe for ids across tenants.
    if (!item) throw new NotFoundException('File not found');
    return item;
  }

  async update(tenantId: string, id: string, dto: UpdateFileDto) {
    await this.get(tenantId, id);
    return this.repo.update(tenantId, id, dto);
  }

  async delete(tenantId: string, id: string) {
    await this.get(tenantId, id);
    return this.repo.delete(tenantId, id);
  }
}
