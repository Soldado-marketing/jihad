import { Injectable } from '@nestjs/common';
import { MembershipRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateNotificationInput {
  /**
   * Deterministic primary key derived from the event, so replaying the same
   * event is a no-op instead of a second row. See NotificationsService.
   */
  id: string;
  tenantId: string;
  recipientUserId: string;
  title: string;
  body?: string;
  resourceType?: string;
  resourceId?: string;
}

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Inserts a notification unless one with the same deterministic id exists.
   *
   * The id encodes the event, so a retried request collides on the primary key
   * and is swallowed rather than producing a duplicate. Returns null when the
   * row was already there.
   */
  async createIfAbsent(input: CreateNotificationInput) {
    try {
      return await this.prisma.notification.create({
        data: {
          id: input.id,
          tenantId: input.tenantId,
          recipientUserId: input.recipientUserId,
          title: input.title,
          body: input.body,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
        },
        select: { id: true, tenantId: true, recipientUserId: true, createdAt: true },
      });
    } catch (error) {
      const duplicate =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
      if (duplicate) return null;
      throw error;
    }
  }

  /**
   * Active members of a tenant holding one of the given roles.
   *
   * Recipient resolution never leaves the tenant: the membership query is
   * scoped by tenantId, so a recipient from another tenant cannot be produced.
   */
  async findRecipientIdsByRole(tenantId: string, roles: MembershipRole[]): Promise<string[]> {
    const memberships = await this.prisma.tenantMembership.findMany({
      where: { tenantId, status: 'ACTIVE', role: { in: roles } },
      select: { userId: true },
    });
    return memberships.map((membership) => membership.userId);
  }

  /** The membership role of one user inside one tenant, or null if not a member. */
  async findMemberRole(tenantId: string, userId: string): Promise<MembershipRole | null> {
    const membership = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      select: { role: true },
    });
    return membership?.role ?? null;
  }

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
