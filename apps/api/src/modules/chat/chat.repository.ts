import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantAwareRepository } from '../../common/repositories/tenant-aware.repository';
import { TenantContext } from '../../common/tenant/tenant-context';
import { CreateChatChannelDto } from './dto/create-chat-channel.dto';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';

export type ChatChannelTypeValue = 'INTERNAL' | 'CLIENT';

export type ChatChannelRecord = {
  id: string;
  tenantId: string;
  type: ChatChannelTypeValue;
  name: string;
  resourceType?: string;
  resourceId?: string;
  clientScopeKey?: string;
  createdByUserId?: string;
  sourceType: 'sprint-7-placeholder';
};

export type ChatMessageRecord = {
  id: string;
  tenantId: string;
  channelId: string;
  body: string;
  createdByUserId?: string;
  clientVisible: boolean;
  clientScopeKey?: string;
  sourceType: 'sprint-7-placeholder';
};

@Injectable()
export class ChatRepository extends TenantAwareRepository {
  listChannels(context: TenantContext): ChatChannelRecord[] {
    const tenant = this.requireTenantContext(context);

    return [
      {
        id: 'sprint-7-internal-channel-placeholder',
        name: 'Internal sprint channel',
        sourceType: 'sprint-7-placeholder',
        tenantId: tenant.tenantId,
        type: 'INTERNAL',
      },
      {
        clientScopeKey: 'client-safe-placeholder',
        id: 'sprint-7-client-channel-placeholder',
        name: 'Client-safe channel placeholder',
        sourceType: 'sprint-7-placeholder',
        tenantId: tenant.tenantId,
        type: 'CLIENT',
      },
    ];
  }

  createChannel(
    context: TenantContext,
    actor: ActorContext | undefined,
    dto: CreateChatChannelDto,
  ): ChatChannelRecord {
    const tenant = this.requireTenantContext(context);
    const type = dto.type ?? 'INTERNAL';

    return {
      clientScopeKey: type === 'CLIENT' ? dto.clientScopeKey : undefined,
      createdByUserId: actor?.actorId,
      id: randomUUID(),
      name: dto.name,
      resourceId: dto.resourceId,
      resourceType: dto.resourceType,
      sourceType: 'sprint-7-placeholder',
      tenantId: tenant.tenantId,
      type,
    };
  }

  getChannelById(context: TenantContext, id: string): ChatChannelRecord {
    const tenant = this.requireTenantContext(context);

    return {
      ...this.placeholderInternalChannel(tenant.tenantId),
      id,
    };
  }

  listMessages(context: TenantContext, channelId: string): ChatMessageRecord[] {
    const tenant = this.requireTenantContext(context);

    return [this.placeholderMessage(tenant.tenantId, channelId)];
  }

  createMessage(
    context: TenantContext,
    actor: ActorContext | undefined,
    channelId: string,
    dto: CreateChatMessageDto,
  ): ChatMessageRecord {
    const tenant = this.requireTenantContext(context);

    return {
      body: dto.body,
      channelId,
      clientScopeKey: dto.clientScopeKey,
      clientVisible: Boolean(dto.clientScopeKey),
      createdByUserId: actor?.actorId,
      id: randomUUID(),
      sourceType: 'sprint-7-placeholder',
      tenantId: tenant.tenantId,
    };
  }

  private placeholderInternalChannel(tenantId: string): ChatChannelRecord {
    return {
      id: 'sprint-7-internal-channel-placeholder',
      name: 'Internal sprint channel',
      sourceType: 'sprint-7-placeholder',
      tenantId,
      type: 'INTERNAL',
    };
  }

  private placeholderMessage(tenantId: string, channelId: string): ChatMessageRecord {
    return {
      body: 'Sprint 7 chat message placeholder',
      channelId,
      clientVisible: false,
      id: 'sprint-7-chat-message-placeholder',
      sourceType: 'sprint-7-placeholder',
      tenantId,
    };
  }
}
