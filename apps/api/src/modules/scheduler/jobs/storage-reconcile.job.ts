import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { logStructured } from '../../../common/logging/structured-logger';
import { describeReconciliation, reconcileStorage } from '../../storage/storage-reconcile';
import { StorageService } from '../../storage/storage.service';
import { OpsAlertsService } from '../ops-alerts.service';
import { ScheduledJob } from '../scheduler.types';

export const STORAGE_RECONCILE_NAME = 'storage-reconcile';

/**
 * C07 — daily, read-only comparison of the object store with the FileVersion
 * rows of every company (the bucket is the platform's own). Objects nobody
 * references and rows whose content is gone are counted; when either exists
 * the OWNERs of the ops company get one notice per day. Nothing is deleted
 * here — that waits for the owner's decision (O38) with the first numbers in
 * hand. The first round runs ten minutes after boot, so a redeploy never
 * postpones the report by a day. Skips silently when storage is not configured.
 */
@Injectable()
export class StorageReconcileJob implements ScheduledJob {
  readonly name = STORAGE_RECONCILE_NAME;
  readonly everyMs = 24 * 60 * 60 * 1000;
  readonly firstRunAfterMs = 10 * 60 * 1000;
  readonly lockKey = 7;

  constructor(
    private readonly storage: StorageService,
    private readonly ops: OpsAlertsService,
  ) {}

  async run(tx: Prisma.TransactionClient, now = new Date()): Promise<number> {
    if (!this.storage.isConfigured()) return 0;
    const { objects, truncated } = await this.storage.listObjects();
    const versions = await tx.fileVersion.findMany({
      select: { id: true, tenantId: true, storageKey: true, status: true, createdAt: true },
    });
    const result = reconcileStorage({ objects, versions, keyPrefix: this.storage.getKeyPrefix(), truncated, now });
    this.ops.lastStorageReconcile = result;
    // Counts only: a key is the capability that protects an object and never reaches a log.
    logStructured(result.needsReview ? 'warn' : 'info', 'storage_reconcile', {
      objects: result.objects,
      versions: result.versions,
      matched: result.matched,
      orphanObjects: result.orphanObjects,
      orphanBytes: result.orphanBytes,
      danglingVersions: result.danglingVersions,
      inFlight: result.inFlight,
      truncated: result.truncated,
    });
    if (!result.needsReview) return 0;
    const day = now.toISOString().slice(0, 10);
    return this.ops.notifyOwners(`ops.storage_review:${day}`, 'Storage needs a review', describeReconciliation(result));
  }
}
