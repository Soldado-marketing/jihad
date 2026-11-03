import { Injectable } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

export interface StorageCheck {
  at: string;
  objects: number;
  bytes: number;
  truncated: boolean;
  limitBytes: number;
  limitObjects: number;
  exceeded: boolean;
}

export interface WatchdogFinding {
  job: string;
  kind: 'failed' | 'silent';
  at: string;
}

/**
 * B06 — operational alerts. Platform conditions (a scheduled job failing or
 * going silent, storage above its limit) are told to every OWNER of every
 * active company as an in-app notice, through the single notification writer
 * (INTERNAL audience, so a CLIENT can never receive one). The dedupe key makes
 * each condition a single notice; the state here feeds `GET /health/ops`.
 */
@Injectable()
export class OpsAlertsService {
  lastStorageCheck: StorageCheck | null = null;
  lastWatchdogAt: string | null = null;
  lastFindings: WatchdogFinding[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** One notice per owner per dedupe key, in every ACTIVE company. Returns notices created. */
  async notifyOwners(dedupeKey: string, title: string, body: string): Promise<number> {
    const tenants = await this.prisma.tenant.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
    let created = 0;
    for (const t of tenants) {
      created += await this.notifications.notify({
        tenantId: t.id,
        recipientRoles: [MembershipRole.OWNER],
        audience: 'INTERNAL',
        dedupeKey,
        title,
        body: body.slice(0, 240),
        resourceType: 'ops',
      });
    }
    return created;
  }
}
