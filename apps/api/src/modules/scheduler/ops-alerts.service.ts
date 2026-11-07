import { Injectable } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import type { StorageReconciliation } from '../storage/storage-reconcile';

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
 * going silent, storage above its limit) are told to the OWNERs of the
 * platform's own company as in-app notices, through the single notification
 * writer (INTERNAL audience, so a CLIENT can never receive one). The ops
 * company is `MAOS_OPS_TENANT_SLUG` when set, otherwise the oldest ACTIVE
 * company — never every company: another agency's owners must not learn
 * about this platform's storage or jobs. The dedupe key makes each condition
 * a single notice; the state here feeds `GET /health/ops`.
 */
@Injectable()
export class OpsAlertsService {
  lastStorageCheck: StorageCheck | null = null;
  lastStorageReconcile: StorageReconciliation | null = null;
  lastWatchdogAt: string | null = null;
  lastFindings: WatchdogFinding[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** The company whose owners receive operational notices, or null when none exists. */
  async opsTenantId(env: NodeJS.ProcessEnv = process.env): Promise<string | null> {
    const slug = env.MAOS_OPS_TENANT_SLUG?.trim();
    const tenant = slug
      ? await this.prisma.tenant.findFirst({ where: { slug, status: 'ACTIVE' }, select: { id: true } })
      : await this.prisma.tenant.findFirst({ where: { status: 'ACTIVE' }, orderBy: { createdAt: 'asc' }, select: { id: true } });
    return tenant?.id ?? null;
  }

  /** One notice per owner of the ops company per dedupe key. Returns notices created. */
  async notifyOwners(dedupeKey: string, title: string, body: string): Promise<number> {
    const tenantId = await this.opsTenantId();
    if (!tenantId) return 0;
    return this.notifications.notify({
      tenantId,
      recipientRoles: [MembershipRole.OWNER],
      audience: 'INTERNAL',
      dedupeKey,
      title,
      body: body.slice(0, 240),
      resourceType: 'ops',
    });
  }
}
