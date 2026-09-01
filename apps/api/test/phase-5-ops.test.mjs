/**
 * Phase 5 - Operational artefacts: CI, backup/restore, deployment guide.
 * Run: node --test test/phase-5-ops.test.mjs
 *
 * These assert the contents of files that cannot be unit-tested by importing
 * them (a workflow, two shell scripts, a markdown guide). The backup and
 * restore scripts themselves were exercised against a real PostgreSQL 16
 * instance; what is checked here is that their safety guards stay in place.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(dirname(apiRoot));
const read = (rel) => readFileSync(join(repoRoot, rel), 'utf8');
const exists = (rel) => existsSync(join(repoRoot, rel));
/** Strips YAML/shell comments so 'must not appear' checks ignore prose. */
const stripHashComments = (src) =>
  src.replace(/^\s*#.*$/gm, '').replace(/\s#[^\n]*$/gm, '');

// ── Continuous integration ────────────────────────────────────────────────────

describe('Phase 5 - CI workflow', () => {
  const path = '.github/workflows/ci.yml';

  it('exists', () => {
    assert.ok(exists(path), 'CI workflow is missing');
  });

  it('runs the API against a real PostgreSQL service', () => {
    const src = read(path);
    assert.match(src, /image: postgres:16-alpine/);
    assert.match(src, /pg_isready/);
    assert.match(src, /DATABASE_URL: postgresql:/);
  });

  it('applies migrations with deploy only', () => {
    const src = read(path);
    assert.match(src, /prisma migrate deploy/);
    // These would rewrite or drop migration history. Comments are stripped
    // first: the workflow explains in prose why they are forbidden.
    assert.doesNotMatch(stripHashComments(src), /migrate dev|db push/);
  });

  it('never runs a forced audit fix', () => {
    const src = read(path);
    assert.doesNotMatch(stripHashComments(src), /audit fix/);
  });

  it('type-checks the build config so the legacy spec files cannot block it', () => {
    const src = read(path);
    assert.match(src, /tsc --noEmit -p tsconfig\.build\.json/);
  });

  it('gates on the integration suite now that it is green', () => {
    const src = read('.github/workflows/ci.yml');
    const section = src.slice(src.indexOf('Integration tests'), src.indexOf('Full suite'));
    assert.ok(section.length > 0, 'integration step missing');
    assert.doesNotMatch(section, /continue-on-error/);
    assert.match(section, /MAOS_INTEGRATION/);
  });

  it('gates on the green suites and reports the known failures separately', () => {
    const src = read(path);
    for (const suite of [
      'test/security-mvp.test.mjs',
      'test/runtime-hardening.test.mjs',
      'test/phase-3-file-storage.test.mjs',
      'test/phase-4-invoicing.test.mjs',
    ]) {
      assert.match(src, new RegExp(suite.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    assert.match(src, /continue-on-error: true/);
  });

  it('explains why the install needs --legacy-peer-deps', () => {
    const src = read(path);
    assert.match(src, /npm ci --legacy-peer-deps/);
    assert.match(src, /@nestjs\/jwt/);
  });
});

// ── Backup ───────────────────────────────────────────────────────────────────

describe('Phase 5 - backup script', () => {
  const path = 'scripts/backup-db.sh';

  it('exists and is executable', () => {
    assert.ok(exists(path));
    const mode = statSync(join(repoRoot, path)).mode;
    assert.ok((mode & 0o111) !== 0, 'backup-db.sh should be executable');
  });

  it('fails closed without a connection string', () => {
    const src = read(path);
    assert.match(src, /set -euo pipefail/);
    assert.match(src, /ERROR: DATABASE_URL is not set/);
  });

  it('writes a compressed custom-format dump with a checksum', () => {
    const src = read(path);
    assert.match(src, /--format=custom/);
    assert.match(src, /--compress=9/);
    assert.match(src, /sha256/);
  });

  it('refuses to keep an empty dump', () => {
    const src = read(path);
    assert.match(src, /backup file is empty/);
  });

  it('prunes only files it created', () => {
    const src = read(path);
    assert.match(src, /maos-\*\.dump/);
    assert.match(src, /BACKUP_RETENTION/);
  });

  it('never puts the connection string on the command line', () => {
    const src = read(path);
    assert.doesNotMatch(src, /echo .*\$DATABASE_URL/);
  });
});

// ── Restore ──────────────────────────────────────────────────────────────────

describe('Phase 5 - restore script', () => {
  const path = 'scripts/restore-db.sh';

  it('exists and is executable', () => {
    assert.ok(exists(path));
    const mode = statSync(join(repoRoot, path)).mode;
    assert.ok((mode & 0o111) !== 0, 'restore-db.sh should be executable');
  });

  it('never drops or overwrites a database', () => {
    const src = read(path);
    assert.doesNotMatch(src, /DROP DATABASE/i);
    assert.doesNotMatch(src, /--clean/);
    assert.match(src, /already exists/);
    assert.match(src, /will not overwrite an existing database/);
  });

  it('verifies the checksum before restoring', () => {
    const src = read(path);
    const checkAt = src.indexOf('--check');
    const restoreAt = src.indexOf('pg_restore \\');
    assert.ok(checkAt > -1 && restoreAt > -1 && checkAt < restoreAt);
  });

  it('rejects a target name that is not a plain identifier', () => {
    const src = read(path);
    assert.match(src, /\^\[a-zA-Z\]\[a-zA-Z0-9_\]\{0,62\}\$/);
  });

  it('stops on the first restore error', () => {
    assert.match(read(path), /--exit-on-error/);
  });
});

// ── Deployment guide ─────────────────────────────────────────────────────────

describe('Phase 5 - deployment guide', () => {
  const src = read('docs/DEPLOY.md');

  it('documents the real bootstrap route', () => {
    assert.match(src, /\/api\/auth\/bootstrap\b/);
    assert.doesNotMatch(src, /auth\/bootstrap-owner/);
  });

  it('documents every storage variable', () => {
    for (const name of [
      'S3_BUCKET',
      'S3_REGION',
      'S3_ACCESS_KEY_ID',
      'S3_SECRET_ACCESS_KEY',
      'S3_ENDPOINT',
      'S3_FORCE_PATH_STYLE',
      'S3_KEY_PREFIX',
      'FILE_MAX_UPLOAD_BYTES',
    ]) {
      assert.match(src, new RegExp(name), `${name} is not documented`);
    }
  });

  it('states that the bucket must stay private', () => {
    assert.match(src, /Keep the bucket \*\*private\*\*/);
  });

  it('states the migration policy', () => {
    assert.match(src, /prisma migrate deploy/);
    assert.match(src, /forbidden/);
  });

  it('documents backup and restore', () => {
    assert.match(src, /scripts\/backup-db\.sh/);
    assert.match(src, /scripts\/restore-db\.sh/);
    assert.match(src, /never drops or overwrites an existing database/);
  });

  it('records the npm ci peer-dependency issue', () => {
    assert.match(src, /--legacy-peer-deps/);
    assert.match(src, /@nestjs\/jwt/);
  });
});

// ── Integration suite guard ──────────────────────────────────────────────────

describe('Phase 5 - integration suite', () => {
  const src = readFileSync(join(apiRoot, 'test/integration-api.test.mjs'), 'utf8');

  it('skips instead of failing when it is not configured', () => {
    assert.match(src, /MAOS_INTEGRATION/);
    assert.match(src, /const skip =/);
    assert.match(src, /dist\/app\.module\.js/);
  });

  it('records that it has actually been run', () => {
    assert.match(src, /STATUS: GREEN/);
  });

  it('covers the boundaries that matter', () => {
    assert.match(src, /rejects \$\{method\.toUpperCase\(\)\}/);
    assert.match(src, /STORAGE_NOT_CONFIGURED/);
    assert.match(src, /UNSUPPORTED_FILE_TYPE/);
    assert.match(src, /revenue must be posted exactly once per invoice/);
    assert.match(src, /a DRAFT invoice must not appear in the client portal/);
  });
});
