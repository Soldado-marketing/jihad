import { Injectable } from '@nestjs/common';
import { ChatChannelType } from '@prisma/client';
import { ChatRepository } from './chat.repository';

@Injectable()
export class ChatService {
  constructor(private readonly repo: ChatRepository) {}

  listChannels(tenantId: string) { return this.repo.listChannels(tenantId); }
  createChannel(tenantId: string, actorId: string, name: string, type?: ChatChannelType) {
    return this.repo.createChannel(tenantId, actorId, name, type);
  }
  listMessages(tenantId: string, channelId: string) { return this.repo.listMessages(tenantId, channelId); }
  createMessage(tenantId: string, channelId: string, actorId: string, body: string) {
    return this.repo.createMessage(tenantId, channelId, actorId, body);
  }
}