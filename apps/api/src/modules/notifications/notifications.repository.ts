import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantAwareRepository } from '../../common/repositories/tenant-aware.repository';
import { TenantContext } from '../../common/tenant/tenant-context';

export type NotificationStatusValue = 'UNREAD' | 'READ' | 'ARCHIVED';

export type NotificationRecord = {
  id: string;
  tenantId: string;
  recipientUserId?: string;
  title: string;
  body?: string;
  status: NotificationStatusValue;
  resourceType?: string;
  resourceId?: string;
  readAt?: string;
  sourceType: 'sprint-7-placeholder';
};

@Injectable()
export class NotificationsRepository extends TenantAwareRepository {
  list(context: TenantContext, actor: ActorContext | undefined): NotificationRecord[] {
    const tenant = this.requireTenantContext(context);

    return [
      {
        body: 'Sprint 7 notification placeholder',
        id: 'sprint-7-notification-placeholder',
        recipientUserId: actor?.actorId,
        resourceId: 'sprint-7-chat-message-placeholder',
        resourceType: 'chat-message',
        sourceType: 'sprint-7-placeholder',
        status: 'UNREAD',
        tenantId: tenant.tenantId,
        title: 'New internal message',
      },
    ];
  }

  createPlaceholder(
    context: TenantContext,
    actor: ActorContext | undefined,
    input: { title: string; resourceType?: string; resourceId?: string },
  ): NotificationRecord {
    const tenant = this.requireTenantContext(context);

    return {
      id: randomUUID(),
      recipientUserId: actor?.actorId,
      resourceId: input.resourceId,
      resourceType: input.resourceType,
      sourceType: 'sprint-7-placeholder',
      status: 'UNREAD',
      tenantId: tenant.tenantId,
      title: input.title,
    };
  }

  markRead(
    context: TenantContext,
    actor: ActorContext | undefined,
    id: string,
  ): NotificationRecord {
    const tenant = this.requireTenantContext(context);

    return {
      id,
      readAt: new Date().toISOString(),
      recipientUserId: actor?.actorId,
      sourceType: 'sprint-7-placeholder',
      status: 'READ',
      tenantId: tenant.tenantId,
      title: 'New internal message',
    };
  }
}
