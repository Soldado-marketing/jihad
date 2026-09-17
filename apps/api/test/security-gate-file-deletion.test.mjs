/**
 * Security & Reliability Gate 1 - file deletion must not orphan stored objects.
 *
 * Run: node --test test/security-gate-file-deletion.test.mjs
 *
 * These are BEHAVIOURAL tests, not source assertions. FilesService imports
 * other local modules, so Node's type stripping cannot load the .ts directly
 * (its ESM resolver needs file extensions, which tsc's CommonJS emit forbids).
 * The compiled CommonJS in dist/ is required instead, and the suite rebuilds it
 * first when it is missing or older than the sources, so a green run can never
 * be a stale one.
 *
 * The service is driven through fakes for the repository and the storage
 * gateway, which is what makes ordering and failure behaviour observable: every
 * call is appended to one shared log, so "objects before rows" and "nothing was
 * deleted" are assertions about that log rather than about prose.
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);

const SOURCES = [
  'src/modules/files/files.service.ts',
  'src/modules/files/files.repository.ts',
  'src/modules/storage/object-key.ts',
];
const COMPILED = 'dist/modules/files/files.service.js';

function ensureBuilt() {
  const out = join(apiRoot, COMPILED);
  const newestSource = Math.max(
    ...SOURCES.map((rel) => statSync(join(apiRoot, rel)).mtimeMs),
  );
  if (existsSync(out) && statSync(out).mtimeMs >= newestSource) return;
  execFileSync('npm', ['run', 'build'], { cwd: apiRoot, stdio: 'ignore' });
}

ensureBuilt();

const { FilesService } = require(join(apiRoot, COMPILED));
const objectKey = await import('../src/modules/storage/object-key.ts');

const TENANT = 'tenantA';
const OTHER_TENANT = 'tenantB';
const PREFIX = '';
const FILE_ID = 'file123';

const keyFor = (tenantId, fileAssetId, versionNumber) =>
  `${PREFIX}tenants/${tenantId}/files/${fileAssetId}/v${versionNumber}/uuid-${versionNumber}.pdf`;

/**
 * One shared call log across both fakes. Ordering assertions read this log, so
 * "the object went first" is observed rather than assumed.
 */
let log;

function makeRepo({ versions, asset = { id: FILE_ID, tenantId: TENANT }, deleteThrows }) {
  return {
    getById: async (tenantId, id) => {
      log.push(`getById:${tenantId}:${id}`);
      // Mirrors the real tenant-scoped query: another tenant's row is invisible.
      if (tenantId !== asset.tenantId || id !== asset.id) return null;
      return asset;
    },
    listVersionStorageKeys: async (tenantId, fileAssetId) => {
      log.push(`listKeys:${tenantId}:${fileAssetId}`);
      return versions;
    },
    delete: async (tenantId, id) => {
      log.push(`dbDelete:${tenantId}:${id}`);
      if (deleteThrows) throw deleteThrows;
      return { id };
    },
  };
}

function makeStorage({ configured = true, prefix = PREFIX, failOn } = {}) {
  return {
    isConfigured: () => configured,
    getKeyPrefix: () => {
      if (!configured) throw new Error('getKeyPrefix called while unconfigured');
      return prefix;
    },
    deleteObject: async (key) => {
      log.push(`s3Delete:${key}`);
      if (failOn && key === failOn) throw new Error('storage_unavailable');
    },
  };
}

const build = (repoOpts, storageOpts) =>
  new FilesService(makeRepo(repoOpts), makeStorage(storageOpts));

async function expectRejection(promise) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  assert.fail('expected the delete to be rejected, but it resolved');
}

const S3_TAG = 's3Delete:';
const s3Deletes = () =>
  log.filter((entry) => entry.startsWith(S3_TAG)).map((entry) => entry.slice(S3_TAG.length));
const dbDeleted = () => log.some((entry) => entry.startsWith('dbDelete:'));

beforeEach(() => {
  log = [];
});

// ── 1. Every object a file owns is removed ───────────────────────────────────

describe('Gate 1 - a file owns many objects', () => {
  it('deletes the object of every version, not only the latest', async () => {
    const versions = [1, 2, 3].map((n) => ({
      id: `v${n}`,
      storageKey: keyFor(TENANT, FILE_ID, n),
    }));
    const svc = build({ versions });

    await svc.delete(TENANT, FILE_ID);

    assert.deepEqual(
      s3Deletes().sort(),
      versions.map((v) => v.storageKey).sort(),
      'every version object must be deleted',
    );
  });

  it('sends each key exactly once', async () => {
    const versions = [1, 2].map((n) => ({
      id: `v${n}`,
      storageKey: keyFor(TENANT, FILE_ID, n),
    }));
    await build({ versions }).delete(TENANT, FILE_ID);

    const keys = s3Deletes();
    assert.equal(new Set(keys).size, keys.length, 'no key should be deleted twice');
  });

  it('keeps per-version keys distinct, so no object is shared', () => {
    const a = objectKey.buildObjectKey({
      keyPrefix: PREFIX, tenantId: TENANT, fileAssetId: FILE_ID,
      versionNumber: 1, originalName: 'report.pdf',
    });
    const b = objectKey.buildObjectKey({
      keyPrefix: PREFIX, tenantId: TENANT, fileAssetId: FILE_ID,
      versionNumber: 2, originalName: 'report.pdf',
    });
    const otherAsset = objectKey.buildObjectKey({
      keyPrefix: PREFIX, tenantId: TENANT, fileAssetId: 'file999',
      versionNumber: 1, originalName: 'report.pdf',
    });

    assert.notEqual(a, b, 'two versions must not share an object');
    assert.notEqual(a, otherAsset, 'two assets must not share an object');
  });
});

// ── 2. Ordering: objects before rows ─────────────────────────────────────────

describe('Gate 1 - deletion ordering', () => {
  it('deletes the objects before the database row', async () => {
    const versions = [{ id: 'v1', storageKey: keyFor(TENANT, FILE_ID, 1) }];
    await build({ versions }).delete(TENANT, FILE_ID);

    const lastObject = log.findLastIndex((e) => e.startsWith('s3Delete:'));
    const row = log.findIndex((e) => e.startsWith('dbDelete:'));

    assert.ok(row > -1 && lastObject > -1);
    assert.ok(lastObject < row, 'the row must not be deleted before the objects');
  });

  it('does not delete the row when an object delete fails', async () => {
    const versions = [1, 2].map((n) => ({
      id: `v${n}`,
      storageKey: keyFor(TENANT, FILE_ID, n),
    }));
    const svc = build({ versions }, { failOn: keyFor(TENANT, FILE_ID, 2) });

    await expectRejection(svc.delete(TENANT, FILE_ID));

    assert.equal(dbDeleted(), false, 'a storage failure must leave the file intact');
  });

  it('is retryable after a partial failure: a second run completes', async () => {
    const versions = [1, 2].map((n) => ({
      id: `v${n}`,
      storageKey: keyFor(TENANT, FILE_ID, n),
    }));

    const failing = build({ versions }, { failOn: keyFor(TENANT, FILE_ID, 2) });
    await expectRejection(failing.delete(TENANT, FILE_ID));

    // DeleteObject is idempotent, so the retry re-sends the key that already
    // succeeded and still converges on a complete delete.
    log = [];
    const retry = build({ versions });
    await retry.delete(TENANT, FILE_ID);

    assert.equal(s3Deletes().length, 2);
    assert.equal(dbDeleted(), true);
  });
});

// ── 3. Deletion targets are trusted, tenant-scoped DB records ────────────────

describe('Gate 1 - deletion targets come from the database', () => {
  it('reads keys with the authenticated tenant id', async () => {
    const versions = [{ id: 'v1', storageKey: keyFor(TENANT, FILE_ID, 1) }];
    await build({ versions }).delete(TENANT, FILE_ID);

    assert.ok(
      log.includes(`listKeys:${TENANT}:${FILE_ID}`),
      'keys must be read under the caller\'s tenant id',
    );
  });

  it('applies the existing tenant check before touching storage', async () => {
    const versions = [{ id: 'v1', storageKey: keyFor(OTHER_TENANT, 'otherFile', 1) }];
    const svc = build({
      versions,
      asset: { id: 'otherFile', tenantId: OTHER_TENANT },
    });

    const error = await expectRejection(svc.delete(TENANT, 'otherFile'));

    assert.equal(error.status, 404, 'another tenant\'s file must read as not found');
    assert.deepEqual(s3Deletes(), [], 'no object may be touched for a foreign file');
    assert.equal(dbDeleted(), false);
  });

  it('refuses a key that points outside the tenant namespace', async () => {
    const versions = [{ id: 'v1', storageKey: keyFor(OTHER_TENANT, FILE_ID, 1) }];
    const svc = build({ versions });

    const error = await expectRejection(svc.delete(TENANT, FILE_ID));

    assert.equal(error.status, 403);
    assert.deepEqual(s3Deletes(), [], 'a cross-tenant key must never reach the bucket');
    assert.equal(dbDeleted(), false, 'and the row must survive rather than orphan it');
  });

  it('rejects a traversal key without deleting anything', async () => {
    const versions = [{ id: 'v1', storageKey: `tenants/${TENANT}/../${OTHER_TENANT}/x.pdf` }];
    const svc = build({ versions });

    const error = await expectRejection(svc.delete(TENANT, FILE_ID));

    assert.equal(error.status, 403);
    assert.deepEqual(s3Deletes(), []);
    assert.equal(dbDeleted(), false);
  });

  it('validates the whole set before deleting any object', async () => {
    const versions = [
      { id: 'v1', storageKey: keyFor(TENANT, FILE_ID, 1) },
      { id: 'v2', storageKey: keyFor(OTHER_TENANT, FILE_ID, 2) },
    ];
    const svc = build({ versions });

    await expectRejection(svc.delete(TENANT, FILE_ID));

    assert.deepEqual(
      s3Deletes(), [],
      'one bad key must abort before the good keys are deleted, not halfway through',
    );
  });
});

// ── 4. Files that own no bytes, and storage that is absent ───────────────────

describe('Gate 1 - files without stored content', () => {
  it('deletes a metadata-only file without consulting storage', async () => {
    const svc = build({ versions: [] }, { configured: false });

    await svc.delete(TENANT, FILE_ID);

    assert.deepEqual(s3Deletes(), []);
    assert.equal(dbDeleted(), true);
  });

  it('ignores versions whose storageKey is null', async () => {
    const versions = [
      { id: 'v1', storageKey: null },
      { id: 'v2', storageKey: keyFor(TENANT, FILE_ID, 2) },
    ];
    await build({ versions }).delete(TENANT, FILE_ID);

    assert.deepEqual(s3Deletes(), [keyFor(TENANT, FILE_ID, 2)]);
    assert.equal(dbDeleted(), true);
  });

  it('refuses to delete stored content while storage is unconfigured', async () => {
    const versions = [{ id: 'v1', storageKey: keyFor(TENANT, FILE_ID, 1) }];
    const svc = build({ versions }, { configured: false });

    const error = await expectRejection(svc.delete(TENANT, FILE_ID));

    assert.equal(error.status, 503);
    assert.equal(error.response.code, 'STORAGE_NOT_CONFIGURED');
    assert.equal(dbDeleted(), false, 'the row must survive so the bytes stay tracked');
  });
});

// ── 5. Wiring and authorisation contracts ────────────────────────────────────

describe('Gate 1 - wiring and authorisation', () => {
  const read = (rel) => require('node:fs').readFileSync(join(apiRoot, rel), 'utf8');

  it('FilesModule imports StorageModule', () => {
    const src = read('src/modules/files/files.module.ts');
    assert.match(src, /imports:\s*\[[^\]]*StorageModule/);
  });

  it('the delete route still requires the FILE DELETE permission', () => {
    const src = read('src/modules/files/files.controller.ts');
    const deleteRoute = src.slice(src.indexOf('@Delete('));
    assert.match(
      deleteRoute,
      /@RequirePermission\(\{[^}]*action:\s*PermissionAction\.DELETE[^}]*\}/,
    );
  });

  it('storage keys are never selected into a controller response', () => {
    // Comments are stripped so the assertion is about code, not about prose
    // that mentions storageKey to explain why it is absent.
    const stripComments = (src) =>
      src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

    for (const rel of [
      'src/modules/files/files.controller.ts',
      'src/modules/files/client-files.controller.ts',
    ]) {
      const code = stripComments(read(rel));
      assert.ok(
        !code.includes('listVersionStorageKeys') && !code.includes('storageKey'),
        `${rel} must not reach storage keys`,
      );
    }
  });
});
