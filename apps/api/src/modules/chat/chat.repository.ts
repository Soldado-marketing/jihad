import { Injectable } from '@nestjs/common';
import { ChatChannelType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  listChannels(tenantId: string) {
    return this.prisma.chatChannel.findMany({
      where: { tenantId },
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

  createMessage(tenantId: string, channelId: string, actorId: string, body: string) {
    return this.prisma.chatMessage.create({
      data: { tenantId, channelId, body, createdByUserId: actorId },
      include: { createdBy: { select: { id: true, displayName: true } } },
    });
  }
}