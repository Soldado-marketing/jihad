import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, userId: string) {
    return this.prisma.notification.findMany({
      where: { tenantId, recipientUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, title: true, body: true, status: true,
        resourceType: true, resourceId: true, createdAt: true, readAt: true,
      },
    });
  }

  markRead(tenantId: string, userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, tenantId, recipientUserId: userId },
      data: { status: 'READ', readAt: new Date() },
    });
  }

  markAllRead(tenantId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { tenantId, recipientUserId: userId, status: 'UNREAD' },
      data: { status: 'READ', readAt: new Date() },
    });
  }

  countUnread(tenantId: string, userId: string) {
    return this.prisma.notification.count({
      where: { tenantId, recipientUserId: userId, status: 'UNREAD' },
    });
  }
}
