/**
 * C07 — reconciliation of the object store against the FileVersion rows.
 *
 * Pure: takes the listing and the rows, returns counts. Nothing here touches
 * storage or the database, and nothing it returns carries a key, a tenant id
 * or a name — the result is written to ops status and to an owner notice.
 *
 * Classes:
 *  - matched: a row's key exists in the store.
 *  - orphan object: an object no row points at (bytes nobody can reach).
 *  - dangling version: a row whose key has no object (content lost).
 *  - metadata-only: a row without a key owns no bytes; counted, never flagged.
 *  - in flight: an object or a row younger than the grace window — an upload
 *    or a delete may still be running (the row is written before the object,
 *    the object is deleted before the row), so neither is reported yet.
 *  - stale reservation: a QUARANTINED row older than the grace window whose
 *    object exists — the upload stored its bytes but never activated.
 *  - unverified: with a truncated listing only keys up to the last listed one
 *    are known; rows beyond it cannot be judged and are counted here.
 */
import { describeSize } from './file-type';

export interface StoredObjectSummary {
  key: string;
  size: number;
  lastModified: Date | null;
}

export interface VersionRowSummary {
  id: string;
  tenantId: string;
  storageKey: string | null;
  status: string;
  createdAt: Date;
}

export interface StorageReconciliation {
  at: string;
  graceMs: number;
  truncated: boolean;
  objects: number;
  objectBytes: number;
  versions: number;
  matched: number;
  orphanObjects: number;
  orphanBytes: number;
  orphanTenants: number;
  unattributedOrphans: number;
  danglingVersions: number;
  metadataOnlyVersions: number;
  staleReservations: number;
  inFlight: number;
  unverifiedVersions: number;
  needsReview: boolean;
}

/** An upload or a delete that started inside this window is still in flight. */
export const RECONCILE_GRACE_MS = 15 * 60 * 1000;

const RESERVED_STATUS = 'QUARANTINED';

/** The tenant segment of a canonical key, or null when the key has another shape. */
export function tenantOfKey(key: string, keyPrefix: string): string | null {
  if (!key.startsWith(keyPrefix)) return null;
  const match = /^tenants\/([A-Za-z0-9_-]{1,64})\/files\//.exec(key.slice(keyPrefix.length));
  return match ? match[1] : null;
}

export interface ReconcileInput {
  objects: StoredObjectSummary[];
  versions: VersionRowSummary[];
  keyPrefix: string;
  truncated: boolean;
  now?: Date;
  graceMs?: number;
}

export function reconcileStorage(input: ReconcileInput): StorageReconciliation {
  const now = input.now ?? new Date();
  const graceMs = input.graceMs ?? RECONCILE_GRACE_MS;
  const young = (at: Date | null): boolean => at !== null && now.getTime() - at.getTime() < graceMs;

  const byKey = new Map<string, StoredObjectSummary>();
  let objectBytes = 0;
  let lastListedKey = '';
  for (const object of input.objects) {
    byKey.set(object.key, object);
    objectBytes += object.size;
    if (object.key > lastListedKey) lastListedKey = object.key;
  }

  const referenced = new Set<string>();
  let matched = 0;
  let danglingVersions = 0;
  let metadataOnlyVersions = 0;
  let staleReservations = 0;
  let unverifiedVersions = 0;
  let inFlight = 0;

  for (const row of input.versions) {
    if (!row.storageKey) {
      metadataOnlyVersions += 1;
      continue;
    }
    referenced.add(row.storageKey);
    if (byKey.has(row.storageKey)) {
      matched += 1;
      if (row.status === RESERVED_STATUS && !young(row.createdAt)) staleReservations += 1;
      continue;
    }
    if (input.truncated && row.storageKey > lastListedKey) {
      unverifiedVersions += 1;
      continue;
    }
    if (young(row.createdAt)) inFlight += 1;
    else danglingVersions += 1;
  }

  let orphanObjects = 0;
  let orphanBytes = 0;
  let unattributedOrphans = 0;
  const orphanTenants = new Set<string>();
  for (const object of input.objects) {
    if (referenced.has(object.key)) continue;
    if (young(object.lastModified)) {
      inFlight += 1;
      continue;
    }
    orphanObjects += 1;
    orphanBytes += object.size;
    const tenant = tenantOfKey(object.key, input.keyPrefix);
    if (tenant) orphanTenants.add(tenant);
    else unattributedOrphans += 1;
  }

  return {
    at: now.toISOString(),
    graceMs,
    truncated: input.truncated,
    objects: input.objects.length,
    objectBytes,
    versions: input.versions.length,
    matched,
    orphanObjects,
    orphanBytes,
    orphanTenants: orphanTenants.size,
    unattributedOrphans,
    danglingVersions,
    metadataOnlyVersions,
    staleReservations,
    inFlight,
    unverifiedVersions,
    needsReview: orphanObjects > 0 || danglingVersions > 0,
  };
}

/** The owner notice: counts and sizes in one short paragraph, never a key. */
export function describeReconciliation(result: StorageReconciliation): string {
  const objects = `${result.orphanObjects} stored object${result.orphanObjects === 1 ? '' : 's'} without a file version (${describeSize(result.orphanBytes)})`;
  const versions = `${result.danglingVersions} file version${result.danglingVersions === 1 ? '' : 's'} without stored content`;
  const partial = result.truncated ? ' The listing was cut at its page limit, so the numbers are a lower bound.' : '';
  return `${objects} and ${versions}. Nothing was deleted; cleanup needs the owner's decision (O38).${partial}`;
}
