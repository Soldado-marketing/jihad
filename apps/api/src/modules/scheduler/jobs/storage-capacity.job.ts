import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { StorageService } from '../../storage/storage.service';
import { OpsAlertsService } from '../ops-alerts.service';
import { ScheduledJob } from '../scheduler.types';

const GIB = 1024 * 1024 * 1024;

/** Limits from the environment; defaults 5 GiB and 50,000 objects. */
export function storageLimits(env: NodeJS.ProcessEnv = process.env): { limitBytes: number; limitObjects: number } {
  const bytes = Number(env.MAOS_STORAGE_ALERT_BYTES);
  const objects = Number(env.MAOS_STORAGE_ALERT_OBJECTS);
  return {
    limitBytes: Number.isFinite(bytes) && bytes > 0 ? bytes : 5 * GIB,
    limitObjects: Number.isFinite(objects) && objects > 0 ? objects : 50_000,
  };
}

/**
 * B06 — read-only inventory of the object store under the configured prefix,
 * compared with the limits; above a limit the owners get one notice per day.
 * Skips silently when storage is not configured.
 */
@Injectable()
export class StorageCapacityJob implements ScheduledJob {
  readonly name = 'storage-capacity';
  readonly everyMs = 6 * 60 * 60 * 1000;
  readonly lockKey = 6;

  constructor(
    private readonly storage: StorageService,
    private readonly ops: OpsAlertsService,
  ) {}

  async run(_tx: Prisma.TransactionClient, now = new Date()): Promise<number> {
    if (!this.storage.isConfigured()) return 0;
    const { objects, bytes, truncated } = await this.storage.countObjects();
    const { limitBytes, limitObjects } = storageLimits();
    const exceeded = bytes > limitBytes || objects > limitObjects || truncated;
    this.ops.lastStorageCheck = { at: now.toISOString(), objects, bytes, truncated, limitBytes, limitObjects, exceeded };
    if (!exceeded) return 0;
    const day = now.toISOString().slice(0, 10);
    return this.ops.notifyOwners(
      `ops.storage_capacity:${day}`,
      'Storage is above its limit',
      `${objects} objects, ${(bytes / GIB).toFixed(2)} GiB (limit ${(limitBytes / GIB).toFixed(1)} GiB / ${limitObjects} objects). Review retention or raise the limit.`,
    );
  }
}
