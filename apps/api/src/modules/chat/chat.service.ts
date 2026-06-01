import { Injectable } from '@nestjs/common';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantContext } from '../../common/tenant/tenant-context';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { RealtimeGatewayPlaceholder } from '../realtime/realtime-gateway.placeholder';
import { ChatChannelRecord, ChatMessageRecord, ChatRepository } from './chat.repository';
import { CreateChatChannelDto } from './dto/create-chat-channel.dto';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly resourceScopeService: ResourceScopeService,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGatewayPlaceholder,
  ) {}

  listChannels(context: TenantContext) {
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });

    return this.chatRepository.listChannels(context);
  }

  createChannel(
    context: TenantContext,
    actor: ActorContext | undefined,
    dto: CreateChatChannelDto,
  ) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    const channel = this.chatRepository.createChannel(context, actor, dto);
    return {
      auditEvent: this.recordChannelAudit(context, actor, channel),
      channel,
    };
  }

  listMessages(context: TenantContext, channelId: string) {
    const channel = this.chatRepository.getChannelById(context, channelId);

    this.realtimeGateway.authorizeSubscriptionPlaceholder(context, undefined, channel);

    return this.chatRepository.listMessages(context, channelId);
  }

  createMessage(
    context: TenantContext,
    actor: ActorContext | undefined,
    channelId: string,
    dto: CreateChatMessageDto,
  ) {
    const channel = this.chatRepository.getChannelById(context, channelId);

    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: channel.tenantId });
    }

    this.realtimeGateway.authorizeSubscriptionPlaceholder(context, actor, channel);

    const message = this.chatRepository.createMessage(context, actor, channelId, dto);
    return {
      auditEvent: this.recordMessageAudit(context, actor, message),
      message,
    };
  }

  private recordChannelAudit(
    context: TenantContext,
    actor: ActorContext | undefined,
    channel: ChatChannelRecord,
  ) {
    return this.auditService.createAuditEventPlaceholder({
      action: 'chat.channel.created',
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId: channel.id,
      resourceType: 'chat-channel',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: {
        channelId: channel.id,
        clientScopeKey: channel.clientScopeKey,
        type: channel.type,
      },
    });
  }

  private recordMessageAudit(
    context: TenantContext,
    actor: ActorContext | undefined,
    message: ChatMessageRecord,
  ) {
    return this.auditService.createAuditEventPlaceholder({
      action: 'chat.message.created',
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId: message.id,
      resourceType: 'chat-message',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: {
        body: 'redacted-message-body-placeholder',
        channelId: message.channelId,
        clientVisible: message.clientVisible,
        messageId: message.id,
      },
    });
  }
}
