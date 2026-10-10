import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginOutcome } from '@prisma/client';
import { createHmac } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/** Longest stored user agent; longer values are truncated. */
const MAX_USER_AGENT = 255;
/** Longest stored email (RFC 5321 path limit); attacker-supplied for failures. */
const MAX_EMAIL = 320;
/** Entries returned by the own-history reader. */
const OWN_HISTORY_LIMIT = 50;

export interface LoginHistoryEntry {
  email: string;
  outcome: LoginOutcome;
  reason?: string;
  userId?: string | null;
  tenantId?: string | null;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class LoginHistoryService {
  private readonly logger = new Logger(LoginHistoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Records one login attempt. Never throws: a failed history write must not
   * change the outcome or the response of the login itself.
   */
  async record(entry: LoginHistoryEntry): Promise<void> {
    try {
      await this.prisma.loginHistory.create({
        data: {
          email: entry.email.toLowerCase().slice(0, MAX_EMAIL),
          outcome: entry.outcome,
          reason: entry.reason ?? null,
          userId: entry.userId ?? null,
          tenantId: entry.tenantId ?? null,
          ipHash: this.hashIp(entry.ip),
          userAgent: entry.userAgent ? entry.userAgent.slice(0, MAX_USER_AGENT) : null,
        },
      });
    } catch {
      // No email, IP or error detail in the log line: it may contain user input.
      this.logger.warn('login history write failed');
    }
  }

  /** The caller's own login attempts, newest first. No IP hash, no email. */
  async listOwn(userId: string) {
    const items = await this.prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: OWN_HISTORY_LIMIT,
      select: { id: true, outcome: true, reason: true, userAgent: true, createdAt: true },
    });
    return { items };
  }

  /**
   * Keyed hash of the client IP: lets repeated attempts from one address be
   * correlated without storing the address itself.
   */
  private hashIp(ip?: string): string | null {
    if (!ip) return null;
    const key = this.config.get<string>('JWT_SECRET');
    if (!key) return null;
    return createHmac('sha256', key).update(`maos-login-ip:${ip}`).digest('hex');
  }
}
