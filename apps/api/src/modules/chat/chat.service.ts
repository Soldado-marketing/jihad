import { Injectable, NotFoundException } from '@nestjs/common';
import { ChatChannelType } from '@prisma/client';
import { ChatRepository } from './chat.repository';

@Injectable()
export class ChatService {
  constructor(private readonly repo: ChatRepository) {}

  listChannels(tenantId: string) { return this.repo.listChannels(tenantId); }
  createChannel(tenantId: string, actorId: string, name: string, type?: ChatChannelType) {
    return this.repo.createChannel(tenantId, actorId, name, type);
  }
  async listMessages(tenantId: string, channelId: string) {
    await this.requireChannel(tenantId, channelId);
    return this.repo.listMessages(tenantId, channelId);
  }
  async createMessage(tenantId: string, channelId: string, actorId: string, body: string) {
    await this.requireChannel(tenantId, channelId);
    return this.repo.createMessage(tenantId, channelId, actorId, body);
  }

  /** A channel outside the caller's tenant is answered as not found. */
  private async requireChannel(tenantId: string, channelId: string) {
    if (!(await this.repo.channelExists(tenantId, channelId))) throw new NotFoundException('Channel not found');
  }
}