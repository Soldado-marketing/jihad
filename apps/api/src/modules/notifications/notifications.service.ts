import { Injectable } from '@nestjs/common';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantContext } from '../../common/tenant/tenant-context';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { MarkNotificationReadDto } from './dto/mark-notification-read.dto';
import { NotificationRecord, NotificationsRepository } from './notifications.repository';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly resourceScopeService: ResourceScopeService,
    private readonly auditService: AuditService,
  ) {}

  listNotifications(context: TenantContext, actor: ActorContext | undefined) {
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });

    return this.notificationsRepository.list(context, actor);
  }

  createNotificationPlaceholder(
    context: TenantContext,
    actor: ActorContext | undefined,
    input: { title: string; resourceType?: string; resourceId?: string },
  ) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    const notification = this.notificationsRepository.createPlaceholder(context, actor, input);
    return {
      auditEvent: this.recordNotificationAudit(context, actor, notification, 'notification.created'),
      notification,
    };
  }

  markRead(
    context: TenantContext,
    actor: ActorContext | undefined,
    id: string,
    _dto: MarkNotificationReadDto,
  ) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    const notification = this.notificationsRepository.markRead(context, actor, id);
    return {
      auditEvent: this.recordNotificationAudit(context, actor, notification, 'notification.read'),
      notification,
    };
  }

  private recordNotificationAudit(
    context: TenantContext,
    actor: ActorContext | undefined,
    notification: NotificationRecord,
    action: 'notification.created' | 'notification.read',
  ) {
    return this.auditService.createAuditEventPlaceholder({
      action,
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId: notification.id,
      resourceType: 'notification',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: {
        notificationBody: 'redacted-notification-body-placeholder',
        notificationId: notification.id,
        status: notification.status,
      },
    });
  }
}
