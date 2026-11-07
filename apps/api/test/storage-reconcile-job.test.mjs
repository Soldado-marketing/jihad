/**
 * C07 — the storage-reconcile job against a real Nest app, an isolated
 * database and the in-memory S3 stub: a clean store raises nothing; a stray
 * object and a row without content become one notice per OWNER of the ops
 * company (never another company, a manager or a client); nothing is deleted;
 * GET /health/ops shows counts only. Run with MAOS_INTEGRATION=1,
 * DATABASE_URL and JWT_SECRET, after `npm run build`.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { before, after, describe, it } from 'node:test';
import { createS3Stub } from './support/s3-stub.mjs';

const require = createRequire(import.meta.url);
const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const skip = process.env.MAOS_INTEGRATION !== '1' || !existsSync(join(apiRoot, 'dist/app.module.js'));
const RUN = 'c07' + Date.now().toString(36);
const PASSWORD = 'StorageReconcileTest123!';
const BUCKET = 'c07-test-bucket';
const DAY = 24 * 3600 * 1000;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

let app, request, prisma, stub, job, ops, scheduler;
const co = {}; const p = {}; const rec = {};

async function member(tenant, role, label, extra = {}) {
  const bcrypt = require('bcrypt');
  const user = await prisma.user.create({ data: { email: `${label}-${RUN}@example.test`, displayName: `${label} ${RUN}`, passwordHash: await bcrypt.hash(PASSWORD, 10), status: 'APPROVED' } });
  await prisma.tenantMembership.create({ data: { tenantId: tenant.id, userId: user.id, role, status: 'ACTIVE', ...extra } });
  return { id: user.id, email: user.email };
}
let ip = 0;
async function login(person, tenant) {
  const res = await request(app.getHttpServer()).post('/api/auth/login').set('X-Forwarded-For', `198.51.100.${++ip}`).send({ email: person.email, passwordOrMagicCode: PASSWORD, tenantSlug: tenant.slug });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.tokens.accessToken;
}
const json = (token, method, path, body) => {
  const req = request(app.getHttpServer())[method](path).set('Authorization', `Bearer ${token}`);
  return body ? req.send(body) : req;
};
const noticesFor = (userId) => prisma.notification.count({ where: { recipientUserId: userId, title: 'Storage needs a review' } });
const storedKey = (asset) => `tenants/${co.a.id}/files/${asset}/v1/00000000-0000-4000-8000-00000000000${Math.floor(Math.random() * 9)}.png`;
/** A stray object written straight into the stub, dated long ago (as the stub dates every object). */
const stray = (k, size = 777) => stub.objects.set(`${BUCKET}/${k}`, { body: Buffer.alloc(size), type: 'image/png', etag: 'stray' });

before(async () => {
  if (skip) return;
  stub = createS3Stub();
  const port = await stub.listen(0);
  process.env.S3_BUCKET = BUCKET;
  process.env.S3_REGION = 'eu-central-1';
  process.env.S3_ACCESS_KEY_ID = 'c07-test-only';
  process.env.S3_SECRET_ACCESS_KEY = 'c07-test-only-not-a-secret';
  process.env.S3_ENDPOINT = `http://127.0.0.1:${port}`;
  process.env.S3_KEY_PREFIX = '';
  process.env.S3_FORCE_PATH_STYLE = 'true';

  require('reflect-metadata');
  const { NestFactory } = require('@nestjs/core');
  const { ValidationPipe } = require('@nestjs/common');
  const { AppModule } = require(join(apiRoot, 'dist/app.module.js'));
  const { AllExceptionsFilter } = require(join(apiRoot, 'dist/common/http/all-exceptions.filter.js'));
  app = await NestFactory.create(AppModule, { logger: false });
  require(join(apiRoot, 'dist/common/http/trust-proxy.js')).configureTrustProxy(app, {});
  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));
  await app.init();
  await app.listen(0, '127.0.0.1');
  request = require('supertest');
  prisma = app.get(require(join(apiRoot, 'dist/modules/prisma/prisma.service.js')).PrismaService);
  job = app.get(require(join(apiRoot, 'dist/modules/scheduler/jobs/storage-reconcile.job.js')).StorageReconcileJob);
  ops = app.get(require(join(apiRoot, 'dist/modules/scheduler/ops-alerts.service.js')).OpsAlertsService);
  scheduler = app.get(require(join(apiRoot, 'dist/modules/scheduler/scheduler.service.js')).SchedulerService);

  co.a = await prisma.tenant.create({ data: { name: `Reconcile A ${RUN}`, slug: `${RUN}-a`, status: 'ACTIVE' } });
  process.env.MAOS_OPS_TENANT_SLUG = co.a.slug;
  co.b = await prisma.tenant.create({ data: { name: `Reconcile B ${RUN}`, slug: `${RUN}-b`, status: 'ACTIVE' } });
  p.owner = await member(co.a, 'OWNER', 'owner');
  p.manager = await member(co.a, 'MANAGER', 'manager');
  p.client = await member(co.a, 'CLIENT', 'client', { visibilityScope: 'CLIENT_LEVEL', clientScopeKey: `c-${RUN}` });
  p.ownerB = await member(co.b, 'OWNER', 'ownerb');
  p.ownerToken = await login(p.owner, co.a);
  p.managerToken = await login(p.manager, co.a);
  rec.project = await prisma.project.create({ data: { tenantId: co.a.id, name: `Project ${RUN}`, status: 'ACTIVE' } });
  const asset = await json(p.ownerToken, 'post', '/api/files', { name: `Reconcile ${RUN}.png`, projectId: rec.project.id, visibility: 'INTERNAL' });
  assert.equal(asset.status, 201, JSON.stringify(asset.body));
  rec.asset = asset.body;
  const v = await request(app.getHttpServer()).post(`/api/files/${rec.asset.id}/versions`).set('Authorization', `Bearer ${p.ownerToken}`).attach('file', PNG, { filename: 'tiny.png', contentType: 'image/png' });
  assert.equal(v.status, 201, JSON.stringify(v.body).slice(0, 300));
  rec.uploaded = v.body;
});
after(async () => {
  delete process.env.MAOS_OPS_TENANT_SLUG;
  if (prisma) await prisma.fileVersion.deleteMany({ where: { tenantId: co.a.id, originalName: { startsWith: 'c07-' } } });
  if (app) await app.close();
  if (stub) await stub.close();
});

describe('C07 — storage-reconcile job', { skip }, () => {
  // The clean run is dated yesterday so its dedupe key differs from today's;
  // every later run uses the real clock, because the grace window is measured
  // against `now` and a shifted clock would age fresh rows artificially.
  const yesterday = new Date(Date.now() - DAY);
  const GRACE = 15 * 60 * 1000;
  /** The algorithm's dangling count, computed independently from the rows and the stub. */
  async function expectedDangling(now) {
    const rows = await prisma.fileVersion.findMany({ where: { storageKey: { not: null } }, select: { storageKey: true, createdAt: true } });
    return rows.filter((r) => now - r.createdAt >= GRACE && !stub.objects.has(`${BUCKET}/${r.storageKey}`)).length;
  }

  it('a store that matches its rows raises no notice, and the uploaded version is matched', async () => {
    const before = await noticesFor(p.owner.id);
    const created = await job.run(prisma, yesterday);
    const r = ops.lastStorageReconcile;
    assert.ok(r, 'status recorded');
    assert.equal(r.orphanObjects, 0, 'this stub holds only what the API wrote');
    assert.equal(r.orphanBytes, 0);
    assert.ok(r.matched >= 1, 'the PNG uploaded through the API has its object');
    assert.ok(r.objects >= 1);
    assert.equal(r.truncated, false);
    // Rows other suites wrote point at their own stubs; measured against
    // yesterday's clock they are all in flight, so nothing is dangling.
    assert.equal(r.danglingVersions, 0);
    assert.equal(r.needsReview, false);
    assert.equal(created, 0);
    assert.equal(await noticesFor(p.owner.id), before);
  });

  it('a stray object and an old row without content become one notice per owner of the ops company only; nothing is deleted', async () => {
    const strayKey = storedKey('stray');
    stray(strayKey, 777);
    const lost = await prisma.fileVersion.create({
      data: { tenantId: co.a.id, fileAssetId: rec.asset.id, versionNumber: 50, originalName: 'c07-lost.png', storageKey: storedKey('lost'), sizeBytes: 5, status: 'ACTIVE', createdAt: new Date(Date.now() - 2 * 3600 * 1000) },
      select: { id: true },
    });
    const reserving = await prisma.fileVersion.create({
      data: { tenantId: co.a.id, fileAssetId: rec.asset.id, versionNumber: 51, originalName: 'c07-reserving.png', storageKey: storedKey('reserving'), sizeBytes: 5, status: 'QUARANTINED' },
      select: { id: true },
    });
    const objectsBefore = stub.objects.size;
    const rowsBefore = await prisma.fileVersion.count();
    const ownerBefore = await noticesFor(p.owner.id);

    const now = new Date();
    const expected = await expectedDangling(now);
    assert.ok(expected >= 1, 'the two-hour-old row without an object is among the dangling rows');
    const created = await job.run(prisma, now);
    const r = ops.lastStorageReconcile;
    assert.equal(r.orphanObjects, 1);
    assert.equal(r.orphanBytes, 777);
    assert.equal(r.orphanTenants, 1);
    assert.equal(r.danglingVersions, expected, 'rows older than the window without an object (other suites\' rows included)');
    assert.ok(r.inFlight >= 1, 'the fresh reservation is still in flight');
    assert.equal(r.needsReview, true);
    assert.equal(created, 1, 'one owner in the ops company');
    assert.equal(await noticesFor(p.owner.id), ownerBefore + 1);
    assert.equal(await noticesFor(p.ownerB.id), 0, 'another company never hears about the platform');
    assert.equal(await noticesFor(p.manager.id), 0);
    assert.equal(await noticesFor(p.client.id), 0);
    const notice = await prisma.notification.findFirst({ where: { recipientUserId: p.owner.id, title: 'Storage needs a review' }, orderBy: { createdAt: 'desc' } });
    assert.match(notice.body, /^1 stored object without a file version \(777 bytes\) and \d+ file versions? without stored content\. Nothing was deleted; cleanup needs the owner's decision \(O38\)\.$/);
    assert.ok(!notice.body.includes('tenants/') && !notice.body.includes(co.a.id), 'no key, no tenant id in the notice');

    assert.equal(stub.objects.size, objectsBefore, 'no object deleted');
    assert.ok(stub.objects.has(`${BUCKET}/${strayKey}`), 'the orphan is still there for the owner to decide on');
    assert.equal(await prisma.fileVersion.count(), rowsBefore, 'no row deleted');
    assert.ok(await prisma.fileVersion.findUnique({ where: { id: lost.id } }));
    assert.ok(await prisma.fileVersion.findUnique({ where: { id: reserving.id } }));

    const again = await job.run(prisma, new Date());
    assert.equal(again, 0, 'same day, no second notice');
    assert.equal(await noticesFor(p.owner.id), ownerBefore + 1);
  });

  it('GET /health/ops shows the reconciliation to the OWNER only, as counts without any key', async () => {
    assert.equal((await request(app.getHttpServer()).get('/api/health/ops')).status, 401);
    assert.equal((await json(p.managerToken, 'get', '/api/health/ops')).status, 403);
    const res = await json(p.ownerToken, 'get', '/api/health/ops');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const r = res.body.storageReconcile;
    assert.ok(r && typeof r.at === 'string');
    assert.equal(r.orphanObjects, 1);
    assert.equal(r.needsReview, true);
    for (const field of ['objects', 'objectBytes', 'versions', 'matched', 'orphanBytes', 'orphanTenants', 'danglingVersions', 'metadataOnlyVersions', 'staleReservations', 'inFlight', 'unverifiedVersions']) assert.equal(typeof r[field], 'number', field);
    const text = JSON.stringify(res.body);
    assert.ok(!text.includes('tenants/') && !text.includes(co.a.id) && !text.includes(BUCKET), 'no key, tenant id or bucket in the status');
    assert.ok(res.body.jobs.some((j) => j.name === 'storage-reconcile' && j.everyMs === DAY), 'registered daily');
  });

  it('is registered on the scheduler with its own lock key and an early first round; skips when storage is not configured', async () => {
    assert.ok(scheduler.status().map((s) => s.name).includes('storage-reconcile'));
    assert.equal(job.lockKey, 7);
    assert.equal(job.firstRunAfterMs, 10 * 60 * 1000);
    const original = job.storage.isConfigured;
    try {
      job.storage.isConfigured = () => false;
      const previous = ops.lastStorageReconcile;
      assert.equal(await job.run(prisma, new Date()), 0);
      assert.equal(ops.lastStorageReconcile, previous, 'unconfigured storage leaves the status untouched');
    } finally {
      job.storage.isConfigured = original;
    }
  });

  it('a run over 2 000 objects and 2 000 rows finishes far inside the scheduler round (measured)', async () => {
    const asset = await prisma.fileAsset.create({ data: { tenantId: co.a.id, name: `c07-bulk ${RUN}`, projectId: rec.project.id }, select: { id: true } });
    const rows = [];
    for (let n = 1; n <= 2000; n += 1) {
      const k = `tenants/${co.a.id}/files/${asset.id}/v${n}/00000000-0000-4000-8000-${String(n).padStart(12, '0')}.png`;
      stray(k, 10);
      rows.push({ tenantId: co.a.id, fileAssetId: asset.id, versionNumber: n, originalName: `c07-bulk-${n}.png`, storageKey: k, sizeBytes: 10, status: 'ACTIVE', createdAt: new Date(Date.now() - 3600 * 1000) });
    }
    await prisma.fileVersion.createMany({ data: rows });
    const started = Date.now();
    await job.run(prisma, new Date());
    const ms = Date.now() - started;
    const r = ops.lastStorageReconcile;
    assert.ok(r.matched >= 2000, String(r.matched));
    assert.ok(r.objects >= 2001);
    assert.ok(ms < 10_000, `${ms} ms`);
    console.log(`[c07] reconcile over ${r.objects} objects / ${r.versions} rows: ${ms} ms`);
    await prisma.fileVersion.deleteMany({ where: { fileAssetId: asset.id } });
    await prisma.fileAsset.delete({ where: { id: asset.id } });
  });

  it('the job source has no delete path and the listing never reaches a response', () => {
    const job = readFileSync(join(apiRoot, 'src/modules/scheduler/jobs/storage-reconcile.job.ts'), 'utf8');
    assert.ok(!/deleteObject|\.delete\(|deleteMany|DeleteObjectCommand/.test(job));
    const controller = readFileSync(join(apiRoot, 'src/modules/scheduler/ops.controller.ts'), 'utf8');
    assert.ok(!/listObjects/.test(controller), 'the controller exposes the summary, never the listing');
  });
});
