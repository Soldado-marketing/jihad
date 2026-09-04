/**
 * Phase 3 - Real file storage.
 * Run: node --test test/phase-3-file-storage.test.mjs
 *
 * Two kinds of test here, on purpose:
 *
 *  1. BEHAVIOURAL - the security-critical pure helpers (object-key.ts,
 *     storage.config.ts) are imported and executed. Node 24 strips TypeScript
 *     types natively, so these run against the real source.
 *
 *  2. CONTRACT - modules that import other local modules cannot be loaded this
 *     way (Node's ESM resolver needs a file extension, which tsc's CommonJS
 *     emit forbids). Those are asserted against their source, matching the
 *     convention already used by the Phase 2 suite.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (rel) => readFileSync(join(apiRoot, rel), 'utf8');
const exists = (rel) => existsSync(join(apiRoot, rel));
/** Strips comments so 'field is absent' assertions ignore prose. */
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const objectKey = await import('../src/modules/storage/object-key.ts');
const storageConfig = await import('../src/modules/storage/storage.config.ts');

const {
  UnsafeObjectKeyError,
  assertKeyBelongsToTenant,
  assertSafeObjectKey,
  buildObjectKey,
  extensionOf,
  sanitizeOriginalName,
  tenantNamespace,
} = objectKey;

// ── Filename sanitisation ─────────────────────────────────────────────────────

describe('Phase 3 - filename sanitisation', () => {
  it('strips POSIX directory components', () => {
    assert.equal(sanitizeOriginalName('../../etc/passwd'), 'passwd');
    assert.equal(sanitizeOriginalName('/var/log/app.txt'), 'app.txt');
  });

  it('strips Windows directory components', () => {
    assert.equal(sanitizeOriginalName('..\\..\\windows\\system32\\cmd.exe'), 'cmd.exe');
    assert.equal(sanitizeOriginalName('C:\\temp\\report.pdf'), 'report.pdf');
  });

  it('never returns an empty, dot, or traversal name', () => {
    for (const input of ['', '.', '..', '...', '/', '\\', null, undefined, 42]) {
      const result = sanitizeOriginalName(input);
      assert.ok(result.length > 0, `empty result for ${String(input)}`);
      assert.ok(!result.includes('/') && !result.includes('\\'));
      assert.notEqual(result, '.');
      assert.notEqual(result, '..');
    }
  });

  it('removes control characters and shell metacharacters', () => {
    const dirty = 'in\u0000voi\u001fce;rm -rf $(x).pdf';
    const clean = sanitizeOriginalName(dirty);
    assert.ok(!clean.includes('\u0000'));
    assert.ok(!clean.includes(';'));
    assert.ok(!clean.includes('$'));
    assert.ok(clean.endsWith('.pdf'));
  });

  it('caps the stored name length', () => {
    const long = `${'a'.repeat(500)}.png`;
    assert.ok(sanitizeOriginalName(long).length <= objectKey.MAX_ORIGINAL_NAME_LENGTH);
  });
});

// ── Extension extraction ──────────────────────────────────────────────────────

describe('Phase 3 - extension extraction', () => {
  it('normalises to a lowercase dotted extension', () => {
    assert.equal(extensionOf('Report.PDF'), '.pdf');
    assert.equal(extensionOf('photo.JPEG'), '.jpeg');
  });

  it('returns empty for names without a usable extension', () => {
    assert.equal(extensionOf('noextension'), '');
    assert.equal(extensionOf('trailingdot.'), '');
    assert.equal(extensionOf('.hidden'), '');
  });

  it('takes only the final extension', () => {
    assert.equal(extensionOf('archive.tar.gz'), '.gz');
  });
});

// ── Object key safety ─────────────────────────────────────────────────────────

describe('Phase 3 - object key safety', () => {
  it('rejects traversal, absolute, and malformed keys', () => {
    const bad = [
      '',
      '/absolute/key',
      'a/../../etc/passwd',
      'a/./b',
      'a//b',
      'a\\b',
      'tenants/t1/../t2/file',
      `x${'y'.repeat(1100)}`,
    ];

    for (const key of bad) {
      assert.throws(
        () => assertSafeObjectKey(key),
        UnsafeObjectKeyError,
        `expected rejection for ${JSON.stringify(key)}`,
      );
    }
  });

  it('rejects keys containing control characters', () => {
    assert.throws(() => assertSafeObjectKey('tenants/t1/a\u0000b'), UnsafeObjectKeyError);
  });

  it('accepts a well-formed key', () => {
    assert.doesNotThrow(() => assertSafeObjectKey('tenants/t1/files/f1/v1/abc-123.png'));
  });
});

// ── Server-side key generation ────────────────────────────────────────────────

describe('Phase 3 - server-side key generation', () => {
  const base = { fileAssetId: 'file1', keyPrefix: '', tenantId: 'tenant1', versionNumber: 1 };

  it('namespaces every key by tenant and asset', () => {
    const key = buildObjectKey({ ...base, originalName: 'brief.pdf' });
    assert.ok(key.startsWith('tenants/tenant1/files/file1/v1/'));
    assert.ok(key.endsWith('.pdf'));
    assert.doesNotThrow(() => assertSafeObjectKey(key));
  });

  it('honours the operator key prefix', () => {
    const key = buildObjectKey({ ...base, keyPrefix: 'maos/', originalName: 'a.png' });
    assert.ok(key.startsWith('maos/tenants/tenant1/files/file1/v1/'));
  });

  it('is unguessable - two uploads of the same name differ', () => {
    const first = buildObjectKey({ ...base, originalName: 'same.png' });
    const second = buildObjectKey({ ...base, originalName: 'same.png' });
    assert.notEqual(first, second);
  });

  it('cannot be steered out of the tenant namespace by the filename', () => {
    const key = buildObjectKey({ ...base, originalName: '../../../../evil.png' });
    assert.ok(key.startsWith('tenants/tenant1/'));
    assert.ok(!key.includes('..'));
  });

  it('rejects identifiers and version numbers with an unexpected shape', () => {
    assert.throws(() => buildObjectKey({ ...base, tenantId: '../other' }), UnsafeObjectKeyError);
    assert.throws(() => buildObjectKey({ ...base, fileAssetId: 'a/b' }), UnsafeObjectKeyError);
    assert.throws(() => buildObjectKey({ ...base, versionNumber: 0 }), UnsafeObjectKeyError);
    assert.throws(() => buildObjectKey({ ...base, versionNumber: 1.5 }), UnsafeObjectKeyError);
  });
});

// ── Tenant isolation on the read path ─────────────────────────────────────────

describe('Phase 3 - tenant isolation on read', () => {
  it('accepts a key inside the tenant namespace', () => {
    assert.doesNotThrow(() =>
      assertKeyBelongsToTenant('tenants/t1/files/f1/v1/a.png', '', 't1'),
    );
  });

  it('rejects a key belonging to another tenant', () => {
    assert.throws(
      () => assertKeyBelongsToTenant('tenants/t2/files/f1/v1/a.png', '', 't1'),
      UnsafeObjectKeyError,
    );
  });

  it('rejects a key that skips the prefix', () => {
    assert.throws(
      () => assertKeyBelongsToTenant('tenants/t1/files/f1/v1/a.png', 'maos/', 't1'),
      UnsafeObjectKeyError,
    );
  });

  it('builds a namespace only for a well-formed tenant id', () => {
    assert.equal(tenantNamespace('', 't1'), 'tenants/t1/');
    assert.throws(() => tenantNamespace('', '../x'), UnsafeObjectKeyError);
  });
});

// ── Storage configuration ─────────────────────────────────────────────────────

describe('Phase 3 - storage configuration', () => {
  const complete = {
    S3_ACCESS_KEY_ID: 'key',
    S3_BUCKET: 'bucket',
    S3_REGION: 'eu-central-1',
    S3_SECRET_ACCESS_KEY: 'secret',
  };

  it('treats a fully empty configuration as "storage absent"', () => {
    assert.equal(storageConfig.isStorageConfigured({}), false);
    const result = storageConfig.validateStorageEnv({});
    assert.equal(result.configured, false);
    assert.equal(result.warnings.length, 1);
  });

  it('fails fast on a half-configured deployment', () => {
    assert.throws(
      () => storageConfig.validateStorageEnv({ S3_BUCKET: 'bucket' }),
      /Incomplete object storage configuration/,
    );
  });

  it('accepts a complete configuration', () => {
    assert.equal(storageConfig.isStorageConfigured(complete), true);
    assert.equal(storageConfig.validateStorageEnv(complete).configured, true);
  });

  it('never echoes a secret value in an error message', () => {
    try {
      storageConfig.validateStorageEnv({ S3_BUCKET: 'bucket', S3_SECRET_ACCESS_KEY: 'topsecret' });
      assert.fail('expected a throw');
    } catch (error) {
      assert.ok(!error.message.includes('topsecret'));
      assert.ok(!error.message.includes('bucket'));
    }
  });

  it('defaults, validates, and caps the upload limit', () => {
    assert.equal(storageConfig.resolveMaxUploadBytes({}), storageConfig.DEFAULT_MAX_UPLOAD_BYTES);
    assert.equal(storageConfig.resolveMaxUploadBytes({ FILE_MAX_UPLOAD_BYTES: '1048576' }), 1048576);
    assert.throws(() => storageConfig.resolveMaxUploadBytes({ FILE_MAX_UPLOAD_BYTES: '0' }));
    assert.throws(() => storageConfig.resolveMaxUploadBytes({ FILE_MAX_UPLOAD_BYTES: '-5' }));
    assert.throws(() => storageConfig.resolveMaxUploadBytes({ FILE_MAX_UPLOAD_BYTES: 'lots' }));
    assert.throws(() =>
      storageConfig.resolveMaxUploadBytes({
        FILE_MAX_UPLOAD_BYTES: String(storageConfig.MAX_UPLOAD_BYTES_HARD_LIMIT + 1),
      }),
    );
  });

  it('strips traversal out of an operator key prefix', () => {
    assert.equal(storageConfig.resolveKeyPrefix({}), '');
    assert.equal(storageConfig.resolveKeyPrefix({ S3_KEY_PREFIX: 'maos' }), 'maos/');
    assert.equal(storageConfig.resolveKeyPrefix({ S3_KEY_PREFIX: '../../maos/' }), 'maos/');
    assert.equal(storageConfig.resolveKeyPrefix({ S3_KEY_PREFIX: '/' }), '');
  });

  it('defaults to path-style addressing only for custom endpoints', () => {
    assert.equal(storageConfig.resolveStorageConfig(complete).forcePathStyle, false);
    assert.equal(
      storageConfig.resolveStorageConfig({ ...complete, S3_ENDPOINT: 'http://localhost:9000' })
        .forcePathStyle,
      true,
    );
  });
});

// ── File type allow-list (source contract) ────────────────────────────────────

describe('Phase 3 - file type allow-list', () => {
  const src = read('src/modules/storage/file-type.ts');

  it('verifies content by magic bytes, not by the declared type', () => {
    assert.match(src, /89504e470d0a1a0a/); // PNG
    assert.match(src, /255044462d/); // %PDF
    assert.match(src, /504b0304/); // ZIP / OOXML
    assert.match(src, /export function matchesSignature/);
  });

  it('excludes formats that can execute script when rendered inline', () => {
    assert.doesNotMatch(src, /'\.svg'/);
    assert.doesNotMatch(src, /'\.html'/);
    assert.doesNotMatch(src, /'\.js'/);
    assert.doesNotMatch(src, /image\/svg/);
  });

  it('downgrades inline to attachment for anything not inline-safe', () => {
    assert.match(src, /export function resolveDisposition/);
    assert.match(src, /if \(requested !== 'inline'\) return 'attachment'/);
  });

  it('enforces a size limit before inspecting content', () => {
    const sizeAt = src.indexOf('FileTooLargeError(');
    const extAt = src.indexOf('const extension = extensionOf');
    assert.ok(sizeAt > -1 && extAt > -1 && sizeAt < extAt);
  });

  it('strips quotes from a Content-Disposition filename', () => {
    assert.match(src, /export function contentDispositionFilename/);
    assert.ok(src.includes(String.raw`replace(/["\\]/g, '')`));
  });
});

// ── Storage gateway (source contract) ─────────────────────────────────────────

describe('Phase 3 - storage gateway', () => {
  const src = read('src/modules/storage/storage.service.ts');

  it('exists and wraps the S3 client', () => {
    assert.ok(exists('src/modules/storage/storage.service.ts'));
    assert.ok(exists('src/modules/storage/storage.module.ts'));
    assert.match(src, /from '@aws-sdk\/client-s3'/);
    assert.match(src, /PutObjectCommand/);
    assert.match(src, /GetObjectCommand/);
  });

  it('re-validates every key before it reaches the bucket', () => {
    const calls = src.match(/assertSafeObjectKey\(/g) ?? [];
    assert.ok(calls.length >= 4, 'every S3 entry point must re-check the key');
  });

  it('never logs a storage key', () => {
    assert.doesNotMatch(src, /logger\.[a-z]+\([^)]*\bkey\b[^)]*\)/);
  });

  it('reports an unconfigured deployment as 503, not 500', () => {
    assert.match(src, /ServiceUnavailableException/);
    assert.match(src, /STORAGE_NOT_CONFIGURED/);
  });
});

// ── Versioning and download authorisation (source contract) ───────────────────

describe('Phase 3 - versioning and download authorisation', () => {
  const service = read('src/modules/file-versions/file-versions.service.ts');
  const repository = read('src/modules/file-versions/file-versions.repository.ts');
  const controller = read('src/modules/files/files.controller.ts');

  it('ships the version module without a competing controller', () => {
    assert.ok(exists('src/modules/file-versions/file-versions.service.ts'));
    assert.ok(exists('src/modules/file-versions/file-versions.repository.ts'));
    assert.equal(exists('src/modules/file-versions/file-versions.controller.ts'), false);
  });

  it('exposes upload, list, and content routes under the file asset', () => {
    assert.match(controller, /@Get\(':id\/versions'\)/);
    assert.match(controller, /@Post\(':id\/versions'\)/);
    assert.match(controller, /@Get\(':id\/versions\/:versionId'\)/);
    assert.match(controller, /@Get\(':id\/versions\/:versionId\/content'\)/);
  });

  it('keeps the response projection free of the storage key', () => {
    const publicSelect = repository.slice(
      repository.indexOf('const PUBLIC_VERSION_SELECT'),
      repository.indexOf('} satisfies Prisma.FileVersionSelect'),
    );
    assert.ok(publicSelect.length > 0);
    assert.doesNotMatch(publicSelect, /storageKey/);
  });

  it('scopes every version query by tenant', () => {
    const queries = repository.match(/where: \{[^}]*\}/g) ?? [];
    assert.ok(queries.length > 0);
    for (const query of queries) {
      assert.match(query, /tenantId/, `unscoped query: ${query}`);
    }
  });

  it('re-checks tenant ownership of the key before streaming', () => {
    assert.match(service, /assertKeyBelongsToTenant/);
  });

  it('gates client downloads on visibility and an approved request', () => {
    assert.match(service, /MembershipRole\.CLIENT/);
    assert.match(service, /file_not_client_visible/);
    assert.match(service, /hasApprovedApproval/);
    assert.match(service, /file_not_approved/);
    assert.match(repository, /ApprovalStatus\.APPROVED/);
  });

  it('refuses to serve quarantined or blocked versions', () => {
    assert.match(service, /DOWNLOADABLE_STATUSES/);
    assert.match(service, /FileVersionStatus\.ACTIVE/);
    assert.match(service, /FileVersionStatus\.SUPERSEDED/);
    assert.match(service, /FILE_VERSION_NOT_DOWNLOADABLE/);
  });

  it('stores bytes before promoting a version to ACTIVE', () => {
    const reserveAt = service.indexOf('reserveWithRetry(');
    const putAt = service.indexOf('storage.putObject(');
    const activateAt = service.indexOf('repo.activateVersion(');
    assert.ok(reserveAt > -1 && putAt > -1 && activateAt > -1);
    assert.ok(reserveAt < putAt && putAt < activateAt);
  });

  it('rolls the reservation back when the object write fails', () => {
    assert.match(service, /deleteVersion\(tenantId, reservation\.id\)/);
  });

  it('supersedes the previous active version', () => {
    assert.match(repository, /FileVersionStatus\.SUPERSEDED/);
    assert.match(repository, /FileVersionStatus\.QUARANTINED/);
  });

  it('audits upload and download, including denials', () => {
    assert.match(service, /file\.version\.upload/);
    assert.match(service, /file\.version\.download/);
    assert.match(service, /AuditOutcome\.BLOCKED/);
    assert.match(service, /AuditPermissionResult\.DENIED/);
  });

  it('never sends a bucket URL or storage key to the browser', () => {
    assert.doesNotMatch(stripComments(controller), /getSignedUrl|presign|storageKey/i);
    assert.match(controller, /result\.stream\.pipe\(res\)/);
  });

  it('sets protective response headers on downloads', () => {
    assert.match(controller, /X-Content-Type-Options.*nosniff/s);
    assert.match(controller, /Cache-Control.*private, no-store/s);
  });

  it('keeps uploads in memory with a hard size ceiling', () => {
    assert.match(controller, /MAX_UPLOAD_BYTES_HARD_LIMIT/);
    assert.match(controller, /files: 1/);
    assert.match(controller, /fileFilter/);
  });

  it('does not accept a client-supplied storage key', () => {
    const dto = read('src/modules/file-versions/dto/create-file-version.dto.ts');
    assert.doesNotMatch(stripComments(dto), /storageKey/);
  });
});

// ── Wiring ────────────────────────────────────────────────────────────────────

describe('Phase 3 - wiring', () => {
  it('registers the version module through the files module', () => {
    const filesModule = read('src/modules/files/files.module.ts');
    assert.match(filesModule, /FileVersionsModule/);

    const versionsModule = read('src/modules/file-versions/file-versions.module.ts');
    assert.match(versionsModule, /StorageModule/);
    // Would be a circular import: FilesModule already imports this module.
    assert.doesNotMatch(stripComments(versionsModule), /FilesModule/);
  });

  it('validates storage configuration during bootstrap', () => {
    const main = read('src/main.ts');
    const validateAt = main.indexOf('validateStorageEnv()');
    const createAt = main.indexOf('NestFactory.create');
    assert.ok(validateAt > -1 && createAt > -1 && validateAt < createAt);
  });

  it('documents every storage variable in .env.example', () => {
    const envExample = read('.env.example');
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
      assert.match(envExample, new RegExp(`^${name}=`, 'm'), `${name} missing`);
    }
  });
});
