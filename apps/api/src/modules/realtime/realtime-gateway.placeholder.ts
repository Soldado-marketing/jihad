import { Injectable } from '@nestjs/common';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantContext } from '../../common/tenant/tenant-context';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { ResourceScopeService } from '../permissions/resource-scope.service';

export type RealtimeSubscriptionDecision = {
  allowed: boolean;
  reason: string;
  tenantId?: string;
  channelId?: string;
  payloadPolicy: 'minimal-reference-only';
};

@Injectable()
export class RealtimeGatewayPlaceholder {
  constructor(
    private readonly resourceScopeService: ResourceScopeService,
    private readonly auditService: AuditService,
  ) {}

  authenticateConnectionPlaceholder(context: TenantContext, actor?: ActorContext) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    return {
      authenticated: Boolean(context.tenantId),
      tenantId: context.tenantId,
    };
  }

  authorizeSubscriptionPlaceholder(
    context: TenantContext,
    actor: ActorContext | undefined,
    channel: { id: string; tenantId: string; clientScopeKey?: string },
  ): RealtimeSubscriptionDecision {
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: channel.tenantId,
    });

    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: channel.tenantId });
    }

    return {
      allowed: true,
      channelId: channel.id,
      payloadPolicy: 'minimal-reference-only',
      reason: 'subscription_authorized_placeholder',
      tenantId: context.tenantId,
    };
  }

  denySubscriptionPlaceholder(
    context: TenantContext,
    actor: ActorContext | undefined,
    channelId: string,
    reason = 'channel_membership_required',
  ): RealtimeSubscriptionDecision {
    this.auditService.createAuditEventPlaceholder({
      action: 'realtime.subscription.denied',
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.BLOCKED,
      permissionResult: AuditPermissionResult.DENIED,
      resourceId: channelId,
      resourceType: 'realtime-subscription',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: {
        reason,
      },
    });

    return {
      allowed: false,
      channelId,
      payloadPolicy: 'minimal-reference-only',
      reason,
      tenantId: context.tenantId,
    };
  }

  handleSessionRevocationPlaceholder(sessionId: string) {
    return {
      action: 'disconnect-or-revalidate-realtime-subscriptions',
      sessionId,
      status: 'placeholder',
    };
  }
}
