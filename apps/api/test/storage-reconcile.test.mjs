/**
 * C07 — reconciliation of the object store against FileVersion rows (pure
 * function, loaded from dist like the other storage helpers): each class of
 * finding, the in-flight grace window, truncated listings, attribution without
 * exposure, and the owner notice text.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const { reconcileStorage, describeReconciliation, tenantOfKey, RECONCILE_GRACE_MS } = require(join(apiRoot, 'dist/modules/storage/storage-reconcile.js'));

const NOW = new Date('2026-11-07T12:00:00Z');
const OLD = new Date(NOW.getTime() - 2 * 60 * 60 * 1000);
const FRESH = new Date(NOW.getTime() - 60 * 1000);
const PREFIX = 'maos/';
const key = (tenant, asset, n = 1) => `${PREFIX}tenants/${tenant}/files/${asset}/v${n}/0f0f0f0f-0000-4000-8000-000000000001.png`;
const object = (k, size = 1024, lastModified = OLD) => ({ key: k, size, lastModified });
const row = (k, over = {}) => ({ id: `row-${Math.random().toString(36).slice(2, 8)}`, tenantId: 'tenant-a', storageKey: k, status: 'ACTIVE', createdAt: OLD, ...over });
const run = (objects, versions, over = {}) => reconcileStorage({ objects, versions, keyPrefix: PREFIX, truncated: false, now: NOW, ...over });

describe('C07 — reconciliation classes', () => {
  it('a row whose key exists in the store is matched and raises nothing', () => {
    const k = key('tenant-a', 'asset1');
    const r = run([object(k)], [row(k)]);
    assert.equal(r.matched, 1);
    assert.equal(r.orphanObjects, 0);
    assert.equal(r.danglingVersions, 0);
    assert.equal(r.needsReview, false);
    assert.equal(r.objects, 1);
    assert.equal(r.versions, 1);
    assert.equal(r.objectBytes, 1024);
  });

  it('an object no row points at is an orphan, with its bytes and its company counted', () => {
    const k = key('tenant-a', 'asset1');
    const r = run([object(k, 4096), object(key('tenant-b', 'asset9'), 100)], [row(k)]);
    assert.equal(r.orphanObjects, 1);
    assert.equal(r.orphanBytes, 100);
    assert.equal(r.orphanTenants, 1);
    assert.equal(r.unattributedOrphans, 0);
    assert.equal(r.needsReview, true);
  });

  it('an orphan whose key has another shape counts as unattributed', () => {
    const r = run([object(`${PREFIX}legacy/blob.bin`, 7), object('outside-prefix/x', 9)], []);
    assert.equal(r.orphanObjects, 2);
    assert.equal(r.unattributedOrphans, 2);
    assert.equal(r.orphanTenants, 0);
    assert.equal(r.orphanBytes, 16);
  });

  it('a row whose key has no object is dangling; a row without a key is metadata-only and never flagged', () => {
    const r = run([], [row(key('tenant-a', 'gone')), row(null)]);
    assert.equal(r.danglingVersions, 1);
    assert.equal(r.metadataOnlyVersions, 1);
    assert.equal(r.needsReview, true);
  });

  it('a QUARANTINED row older than the grace window whose object exists is a stale reservation, still matched', () => {
    const k = key('tenant-a', 'stuck');
    const r = run([object(k)], [row(k, { status: 'QUARANTINED' }), row(key('tenant-a', 'fresh'), { status: 'QUARANTINED', createdAt: FRESH })]);
    assert.equal(r.matched, 1);
    assert.equal(r.staleReservations, 1);
    assert.equal(r.inFlight, 1, 'the fresh reservation without an object is an upload under way');
    assert.equal(r.danglingVersions, 0);
    assert.equal(r.needsReview, false);
  });
});

describe('C07 — grace window', () => {
  it('objects and rows younger than the window are in flight on both sides, not findings', () => {
    const r = run([object(key('tenant-a', 'uploading'), 10, FRESH)], [row(key('tenant-a', 'reserving'), { createdAt: FRESH })]);
    assert.equal(r.inFlight, 2);
    assert.equal(r.orphanObjects, 0);
    assert.equal(r.danglingVersions, 0);
    assert.equal(r.needsReview, false);
    assert.equal(r.graceMs, RECONCILE_GRACE_MS);
    assert.equal(RECONCILE_GRACE_MS, 15 * 60 * 1000);
  });

  it('exactly at the window edge an object is no longer in flight; without a timestamp it is judged', () => {
    const edge = new Date(NOW.getTime() - RECONCILE_GRACE_MS);
    const r = run([object(key('tenant-a', 'edge'), 1, edge), object(key('tenant-a', 'nodate'), 1, null)], []);
    assert.equal(r.orphanObjects, 2);
    assert.equal(r.inFlight, 0);
  });

  it('a custom grace window is honoured', () => {
    const r = run([object(key('tenant-a', 'x'), 1, FRESH)], [], { graceMs: 1000 });
    assert.equal(r.orphanObjects, 1);
  });
});

describe('C07 — truncated listing', () => {
  it('rows beyond the last listed key cannot be judged and are counted as unverified, not dangling', () => {
    const listed = key('tenant-a', 'aaaa');
    const beyond = key('tenant-z', 'zzzz');
    const before = key('tenant-a', '0000');
    const r = run([object(listed)], [row(listed), row(beyond), row(before)], { truncated: true });
    assert.equal(r.truncated, true);
    assert.equal(r.matched, 1);
    assert.equal(r.unverifiedVersions, 1);
    assert.equal(r.danglingVersions, 1, 'a key before the last listed one is known to be missing');
  });
});

describe('C07 — nothing sensitive leaves the summary', () => {
  it('the summary and the notice carry numbers and words only: no key, no tenant id, no row id', () => {
    const k = key('tenant-secret', 'asset-secret');
    const r = run([object(k, 2 * 1024 * 1024), object(key('tenant-secret', 'other'), 1)], [row(key('tenant-secret', 'lost'), { id: 'row-secret' })]);
    const text = JSON.stringify(r) + describeReconciliation(r);
    for (const needle of ['tenant-secret', 'asset-secret', 'row-secret', 'tenants/', PREFIX]) assert.ok(!text.includes(needle), needle);
    for (const field of Object.values(r)) assert.ok(['number', 'boolean', 'string'].includes(typeof field));
  });

  it('the notice is one plain paragraph under the 240-character notice limit and says nothing was deleted', () => {
    const r = run([object(key('tenant-a', 'a'), 3 * 1024 * 1024 + 512 * 1024)], [row(key('tenant-a', 'b'))]);
    const body = describeReconciliation(r);
    assert.equal(body, "1 stored object without a file version (3.5 MiB) and 1 file version without stored content. Nothing was deleted; cleanup needs the owner's decision (O38).");
    assert.ok(body.length <= 240, String(body.length));
    const plural = describeReconciliation(run([object(key('tenant-a', 'a'), 10), object(key('tenant-a', 'b'), 10)], [], { truncated: true }));
    assert.match(plural, /^2 stored objects without a file version \(20 bytes\) and 0 file versions without stored content\./);
    assert.match(plural, /lower bound\.$/);
    assert.ok(plural.length <= 240, String(plural.length));
  });

  it('tenantOfKey reads the tenant segment of a canonical key only', () => {
    assert.equal(tenantOfKey(key('tenant-a', 'x'), PREFIX), 'tenant-a');
    assert.equal(tenantOfKey(`tenants/t1/files/a/v1/u.png`, ''), 't1');
    assert.equal(tenantOfKey(`tenants/t1/files/a/v1/u.png`, PREFIX), null, 'outside the prefix');
    assert.equal(tenantOfKey(`${PREFIX}tenants/../files/a/v1/u.png`, PREFIX), null);
    assert.equal(tenantOfKey(`${PREFIX}tenants/t1/other/a`, PREFIX), null);
  });
});

describe('C07 — the report job never deletes', () => {
  it('neither the job nor the reconciliation source contains a delete call', async () => {
    const { readFileSync } = await import('node:fs');
    for (const file of ['src/modules/scheduler/jobs/storage-reconcile.job.ts', 'src/modules/storage/storage-reconcile.ts']) {
      const source = readFileSync(join(apiRoot, file), 'utf8');
      assert.ok(!/deleteObject|\.delete\(|deleteMany|DeleteObjectCommand|putObject/.test(source), file);
    }
    const job = readFileSync(join(apiRoot, 'src/modules/scheduler/jobs/storage-reconcile.job.ts'), 'utf8');
    assert.match(job, /readonly firstRunAfterMs = 10 \* 60 \* 1000/);
    assert.match(job, /readonly everyMs = 24 \* 60 \* 60 \* 1000/);
    assert.match(job, /readonly lockKey = 7/);
  });
});
