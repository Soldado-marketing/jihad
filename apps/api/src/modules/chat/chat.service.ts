import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditOutcome, AuditPermissionResult, ChatChannelType, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { ChatRepository } from './chat.repository';

@Injectable()
export class ChatService {
  constructor(
    private readonly repo: ChatRepository,
    private readonly resourceScope: ResourceScopeService,
    private readonly audit: AuditService,
  ) {}

  // ── Channel members (OWNER and MANAGER: CHAT_CHANNEL update) ─────────────
  // A contractor sees a channel only as a member (or through a visible
  // project), so this is how a contractor is given exactly their channels.

  async listMembers(tenantId: string, actorId: string, channelId: string) {
    await this.requireChannel(tenantId, actorId, channelId);
    return this.repo.listMembers(tenantId, channelId);
  }

  async addMember(tenantId: string, actorId: string, sessionId: string, channelId: string, userId: string) {
    await this.requireChannel(tenantId, actorId, channelId);
    const member = await this.repo.internalMember(tenantId, userId);
    if (!member) throw new BadRequestException({ code: 'INVALID_REFERENCE', field: 'userId' });
    const added = await this.repo.addMember(tenantId, channelId, userId, member.role);
    if (added) await this.record(tenantId, actorId, sessionId, channelId, 'chat.member_added', userId);
    return { channelId, userId, member: true };
  }

  async removeMember(tenantId: string, actorId: string, sessionId: string, channelId: string, userId: string) {
    await this.requireChannel(tenantId, actorId, channelId);
    if (await this.repo.removeMember(tenantId, channelId, userId)) {
      await this.record(tenantId, actorId, sessionId, channelId, 'chat.member_removed', userId);
    }
    return { channelId, userId, member: false };
  }

  private record(tenantId: string, actorId: string, sessionId: string, channelId: string, action: string, userId: string) {
    return this.audit.createAuditEvent({
      tenantId, actorId, sessionId,
      resourceType: 'ChatChannel', resourceId: channelId, action,
      permissionResult: AuditPermissionResult.ALLOWED, outcome: AuditOutcome.SUCCESS,
      payload: { userId },
    }).catch(() => undefined);
  }

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
