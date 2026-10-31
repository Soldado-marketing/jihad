import { Injectable, NotFoundException } from '@nestjs/common';
import { ChatChannelType, Prisma } from '@prisma/client';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { ChatRepository } from './chat.repository';

@Injectable()
export class ChatService {
  constructor(
    private readonly repo: ChatRepository,
    private readonly resourceScope: ResourceScopeService,
  ) {}

  async listChannels(tenantId: string, actorId: string) {
    return this.repo.listChannels(tenantId, await this.visibleChannels(tenantId, actorId));
  }
  createChannel(tenantId: string, actorId: string, name: string, type?: ChatChannelType) {
    return this.repo.createChannel(tenantId, actorId, name, type);
  }
  async listMessages(tenantId: string, actorId: string, channelId: string) {
    await this.requireChannel(tenantId, actorId, channelId);
    return this.repo.listMessages(tenantId, channelId);
  }
  async createMessage(tenantId: string, channelId: string, actorId: string, body: string) {
    await this.requireChannel(tenantId, actorId, channelId);
    return this.repo.createMessage(tenantId, channelId, actorId, body);
  }

  /**
   * A CONTRACTOR sees only channels they are a member of or that belong to a
   * project they can see (MAOS-T35 assigned-work rule); every other internal
   * role keeps the company's channels.
   */
  private async visibleChannels(tenantId: string, actorId: string): Promise<Prisma.ChatChannelWhereInput> {
    const scope = await this.resourceScope.resolveWorkScope(tenantId, actorId);
    if (!scope || scope.tasksOnly) return {};
    return {
      OR: [
        { memberships: { some: { tenantId, userId: actorId } } },
        { resourceType: 'project', resourceId: { in: scope.visibleProjectIds } },
      ],
    };
  }

  /** A channel outside the caller's tenant or scope is answered as not found. */
  private async requireChannel(tenantId: string, actorId: string, channelId: string) {
    const visible = await this.visibleChannels(tenantId, actorId);
    if (!(await this.repo.channelExists(tenantId, channelId, visible))) throw new NotFoundException('Channel not found');
  }
}
