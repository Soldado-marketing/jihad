import { Injectable } from '@nestjs/common';
import { ChatChannelType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  listChannels(tenantId: string, visible: Prisma.ChatChannelWhereInput = {}) {
    return this.prisma.chatChannel.findMany({
      where: { tenantId, AND: [visible] },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, name: true, type: true, createdAt: true, updatedAt: true,
        _count: { select: { messages: true } },
      },
    });
  }

  createChannel(tenantId: string, actorId: string, name: string, type: ChatChannelType = ChatChannelType.INTERNAL) {
    return this.prisma.chatChannel.create({
      data: { tenantId, name, type, createdByUserId: actorId },
    });
  }

  listMessages(tenantId: string, channelId: string) {
    return this.prisma.chatMessage.findMany({
      where: { tenantId, channelId },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: {
        id: true, body: true, createdAt: true,
        createdBy: { select: { id: true, displayName: true } },
      },
    });
  }

  async channelExists(tenantId: string, channelId: string, visible: Prisma.ChatChannelWhereInput = {}): Promise<boolean> {
    const channel = await this.prisma.chatChannel.findFirst({
      where: { id: channelId, tenantId, AND: [visible] },
      select: { id: true },
    });
    return channel !== null;
  }

  createMessage(tenantId: string, channelId: string, actorId: string, body: string) {
    return this.prisma.chatMessage.create({
      data: { tenantId, channelId, body, createdByUserId: actorId },
      include: { createdBy: { select: { id: true, displayName: true } } },
    });
  }

  listMembers(tenantId: string, channelId: string) {
    return this.prisma.chatMembership.findMany({
      where: { tenantId, channelId, userId: { not: null } },
      orderBy: { createdAt: 'asc' },
      select: { userId: true, role: true, createdAt: true, user: { select: { displayName: true, email: true } } },
    });
  }

  /** The member's ACTIVE internal membership (CLIENT is not a chat member here). */
  internalMember(tenantId: string, userId: string) {
    return this.prisma.tenantMembership.findFirst({
      where: { tenantId, userId, status: 'ACTIVE', role: { not: 'CLIENT' } },
      select: { role: true },
    });
  }

  async addMember(tenantId: string, channelId: string, userId: string, role: string) {
    const existing = await this.prisma.chatMembership.findFirst({ where: { tenantId, channelId, userId }, select: { id: true } });
    if (existing) return false;
    await this.prisma.chatMembership.create({ data: { tenantId, channelId, userId, role: role as never } });
    return true;
  }

  async removeMember(tenantId: string, channelId: string, userId: string) {
    const { count } = await this.prisma.chatMembership.deleteMany({ where: { tenantId, channelId, userId } });
    return count > 0;
  }
}
