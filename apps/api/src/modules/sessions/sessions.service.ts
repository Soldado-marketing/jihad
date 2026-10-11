import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Fields a caller may see about their own sessions: never the token hash. */
const SESSION_SELECT = {
  id: true,
  status: true,
  createdAt: true,
  lastSeenAt: true,
  expiresAt: true,
  device: { select: { userAgent: true, lastSeenAt: true } },
} as const;

/** Upper bound on listed sessions; a user rarely has more than a handful. */
const MAX_LISTED = 50;

/** The caller, as carried by the access token. */
export interface SessionOwner {
  sub: string;
  tenantId: string;
  sessionId: string;
}

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** The session behind the access token in use. */
  async current(owner: SessionOwner) {
    const session = await this.prisma.session.findFirst({
      where: { id: owner.sessionId, userId: owner.sub, tenantId: owner.tenantId },
      select: SESSION_SELECT,
    });
    if (!session) throw new NotFoundException('Session not found');
    return { ...session, current: true };
  }

  /** The caller's active, unexpired sessions in the current tenant, newest first. */
  async listOwn(owner: SessionOwner) {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId: owner.sub,
        tenantId: owner.tenantId,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_LISTED,
      select: SESSION_SELECT,
    });
    return { items: sessions.map((s) => ({ ...s, current: s.id === owner.sessionId })) };
  }

  /**
   * Revokes one of the caller's own active sessions. Anything else - another
   * user's session, another tenant's, an unknown or already revoked id -
   * answers the same 404, so the endpoint cannot be used to probe session ids.
   */
  async revokeOwn(owner: SessionOwner, sessionId: string) {
    const result = await this.prisma.session.updateMany({
      where: { id: sessionId, userId: owner.sub, tenantId: owner.tenantId, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });
    if (result.count !== 1) throw new NotFoundException('Session not found');
    return { sessionId, status: 'REVOKED' as const };
  }
}
