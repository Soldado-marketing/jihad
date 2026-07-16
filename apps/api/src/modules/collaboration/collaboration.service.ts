import { Injectable, NotFoundException } from '@nestjs/common';
import { CollaborationRepository } from './collaboration.repository';

@Injectable()
export class CollaborationService {
  constructor(private readonly repo: CollaborationRepository) {}

  listNotes(tenantId: string, resourceType?: string, resourceId?: string) {
    return this.repo.listNotes(tenantId, resourceType, resourceId);
  }
  createNote(tenantId: string, actorId: string, body: string, resourceType?: string, resourceId?: string, threadKey?: string) {
    return this.repo.createNote(tenantId, actorId, body, resourceType, resourceId, threadKey);
  }
  async getNote(tenantId: string, id: string) {
    const item = await this.repo.getNoteById(tenantId, id);
    if (!item) throw new NotFoundException('Note not found');
    return item;
  }
  async updateNote(tenantId: string, id: string, body: string) {
    await this.getNote(tenantId, id);
    return this.repo.updateNote(tenantId, id, body);
  }
  async deleteNote(tenantId: string, id: string) {
    await this.getNote(tenantId, id);
    return this.repo.deleteNote(tenantId, id);
  }
}