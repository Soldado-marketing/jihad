import { Injectable } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';

@Injectable()
export class NotificationsService {
  constructor(private readonly repo: NotificationsRepository) {}

  list(tenantId: string, userId: string) { return this.repo.list(tenantId, userId); }
  markRead(tenantId: string, userId: string, id: string) { return this.repo.markRead(tenantId, userId, id); }
  markAllRead(tenantId: string, userId: string) { return this.repo.markAllRead(tenantId, userId); }
  countUnread(tenantId: string, userId: string) { return this.repo.countUnread(tenantId, userId); }
}
