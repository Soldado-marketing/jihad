/**
 * C08 — storage persistence and cleanup after deletes, against a real Nest
 * app, an isolated database and the in-memory S3 stub (a store that can be
 * listed). `security-gate-file-deletion` proves the call order through fakes;
 * this suite proves the inventory: files uploaded through the HTTP API and
 * deleted through DELETE /api/files/:id leave the bucket with exactly the key
 * set it had before, the files that were not deleted keep their bytes (also
 * across an API restart), a failed delete is retryable, nobody outside the
 * company or without the permission can remove anything, and a file whose
 * project or task was deleted stays an ordinary, manageable file.
 * Run with MAOS_INTEGRATION=1, DATABASE_URL and JWT_SECRET, after `npm run build`.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { before, after, describe, it } from 'node:test';
import { createS3Stub } from './support/s3-stub.mjs';

const require = createRequire(import.meta.url);
const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const skip = process.env.MAOS_INTEGRATION !== '1' || !existsSync(join(apiRoot, 'dist/app.module.js'));
const RUN = 'c08' + Date.now().toString(36);
const PASSWORD = 'StorageDeleteTest123!';
const BUCKET = 'c08-test-bucket';

let app, request, prisma, stub, storage, job, ops;
const co = {}; const p = {}; const kept = {};

const sha = (buf) => createHash('sha256').update(buf).digest('hex');
/** Distinct, NUL-free text content per file, so a mixed-up object would be noticed. */
const content = (label) => Buffer.from(`C08 ${RUN} ${label}\n`.repeat(40), 'utf8');
/** The store's inventory: every key in the bucket, sorted. */
const inventory = () => [...stub.objects.keys()].filter((k) => k.startsWith(`${BUCKET}/`)).sort();

async function boot() {
  const { NestFactory } = require('@nestjs/core');
  const { ValidationPipe } = require('@nestjs/common');
  const { AppModule } = require(join(apiRoot, 'dist/app.module.js'));
  const { AllExceptionsFilter } = require(join(apiRoot, 'dist/common/http/all-exceptions.filter.js'));
  const instance = await NestFactory.create(AppModule, { logger: false });
  require(join(apiRoot, 'dist/common/http/trust-proxy.js')).configureTrustProxy(instance, {});
  instance.useGlobalFilters(new AllExceptionsFilter());
  instance.setGlobalPrefix('api');
  instance.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));
  await instance.init();
  await instance.listen(0, '127.0.0.1');
  prisma = instance.get(require(join(apiRoot, 'dist/modules/prisma/prisma.service.js')).PrismaService);
  storage = instance.get(require(join(apiRoot, 'dist/modules/storage/storage.service.js')).StorageService);
  job = instance.get(require(join(apiRoot, 'dist/modules/scheduler/jobs/storage-reconcile.job.js')).StorageReconcileJob);
  ops = instance.get(require(join(apiRoot, 'dist/modules/scheduler/ops-alerts.service.js')).OpsAlertsService);
  return instance;
}

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
const call = (token, method, path, body) => {
  const req = request(app.getHttpServer())[method](path).set('Authorization', `Bearer ${token}`);
  return body ? req.send(body) : req;
};
/** Creates a file with one uploaded version per label; returns ids and the bytes sent. */
async function upload(token, projectId, name, labels, extra = {}) {
  const asset = await call(token, 'post', '/api/files', { name: `${name} ${RUN}.txt`, projectId, visibility: 'INTERNAL', ...extra });
  assert.equal(asset.status, 201, JSON.stringify(asset.body));
  const versions = [];
  for (const label of labels) {
    const body = content(`${name} ${label}`);
    const v = await request(app.getHttpServer()).post(`/api/files/${asset.body.id}/versions`).set('Authorization', `Bearer ${token}`).attach('file', body, { filename: `${name}-${label}.txt`, contentType: 'text/plain' });
    assert.equal(v.status, 201, JSON.stringify(v.body).slice(0, 300));
    versions.push({ id: v.body.id, sha: sha(body) });
  }
  return { id: asset.body.id, versions };
}
async function download(token, fileId, versionId) {
  return request(app.getHttpServer()).get(`/api/files/${fileId}/versions/${versionId}/content`).set('Authorization', `Bearer ${token}`)
    .buffer(true).parse((res, done) => { const chunks = []; res.on('data', (c) => chunks.push(c)); res.on('end', () => done(null, Buffer.concat(chunks))); });
}
async function assertIntact(token, file, why) {
  for (const v of file.versions) {
    const res = await download(token, file.id, v.id);
    assert.equal(res.status, 200, why);
    assert.equal(sha(res.body), v.sha, `${why}: bytes identical`);
  }
}
const rowsOf = (ids) => prisma.fileVersion.count({ where: { fileAssetId: { in: ids } } });

before(async () => {
  if (skip) return;
  stub = createS3Stub();
  const port = await stub.listen(0);
  process.env.S3_BUCKET = BUCKET;
  process.env.S3_REGION = 'eu-central-1';
  process.env.S3_ACCESS_KEY_ID = 'c08-test-only';
  process.env.S3_SECRET_ACCESS_KEY = 'c08-test-only-not-a-secret';
  process.env.S3_ENDPOINT = `http://127.0.0.1:${port}`;
  process.env.S3_KEY_PREFIX = '';
  process.env.S3_FORCE_PATH_STYLE = 'true';
  require('reflect-metadata');
  request = require('supertest');
  app = await boot();

  co.a = await prisma.tenant.create({ data: { name: `Delete A ${RUN}`, slug: `${RUN}-a`, status: 'ACTIVE' } });
  co.b = await prisma.tenant.create({ data: { name: `Delete B ${RUN}`, slug: `${RUN}-b`, status: 'ACTIVE' } });
  // Notices of the reconciliation job stay inside this suite's own company.
  process.env.MAOS_OPS_TENANT_SLUG = co.a.slug;
  p.owner = await member(co.a, 'OWNER', 'owner');
  p.client = await member(co.a, 'CLIENT', 'client', { visibilityScope: 'CLIENT_LEVEL', clientScopeKey: `c-${RUN}` });
  p.ownerB = await member(co.b, 'OWNER', 'ownerb');
  p.ownerToken = await login(p.owner, co.a);
  p.clientToken = await login(p.client, co.a);
  p.ownerBToken = await login(p.ownerB, co.b);
  co.project = await prisma.project.create({ data: { tenantId: co.a.id, name: `Project ${RUN}`, status: 'ACTIVE' } });
  co.projectB = await prisma.project.create({ data: { tenantId: co.b.id, name: `Project B ${RUN}`, status: 'ACTIVE' } });
  // The files that must survive everything below.
  kept.same = await upload(p.ownerToken, co.project.id, 'kept-same-project', ['v1', 'v2']);
  kept.other = await upload(p.ownerBToken, co.projectB.id, 'kept-other-company', ['v1']);
});
after(async () => {
  delete process.env.MAOS_OPS_TENANT_SLUG;
  if (app) await app.close();
  if (stub) await stub.close();
});

describe('C08 — inventory and persistence after deletes', { skip }, () => {
  it('upload then delete returns the bucket to exactly its starting inventory; rows and content are gone', async () => {
    const start = inventory();
    assert.equal(start.length, 3, 'the kept files own three objects');

    const one = await upload(p.ownerToken, co.project.id, 'doomed-one', ['v1']);
    const many = await upload(p.ownerToken, co.project.id, 'doomed-many', ['v1', 'v2', 'v3']);
    const during = inventory();
    assert.equal(during.length, start.length + 4, 'one object per uploaded version');
    for (const file of [one, many]) {
      const mine = during.filter((k) => k.includes(`/tenants/${co.a.id}/files/${file.id}/`));
      assert.equal(mine.length, file.versions.length, 'every version has its own key under its company and file');
    }
    await assertIntact(p.ownerToken, many, 'before the delete');

    for (const file of [one, many]) {
      const res = await call(p.ownerToken, 'delete', `/api/files/${file.id}`);
      assert.equal(res.status, 204, JSON.stringify(res.body));
    }

    assert.deepEqual(inventory(), start, 'the key set equals the starting inventory: no orphan, nothing else removed');
    assert.equal(await rowsOf([one.id, many.id]), 0, 'no version row left');
    assert.equal(await prisma.fileAsset.count({ where: { id: { in: [one.id, many.id] } } }), 0);
    assert.equal((await call(p.ownerToken, 'get', `/api/files/${many.id}`)).status, 404);
    assert.equal((await download(p.ownerToken, many.id, many.versions[0].id)).status, 404);
  });

  it('the files that were not deleted keep byte-identical content, in the same project and in another company', async () => {
    await assertIntact(p.ownerToken, kept.same, 'same project after the deletes');
    await assertIntact(p.ownerBToken, kept.other, 'other company after the deletes');
  });

  it('a failed object delete answers an error and keeps the file; the retry completes and the inventory is clean', async () => {
    const start = inventory();
    const file = await upload(p.ownerToken, co.project.id, 'doomed-flaky', ['v1', 'v2']);
    const real = storage.deleteObject;
    let calls = 0;
    storage.deleteObject = async function (key) {
      if (++calls === 2) throw new Error('simulated storage outage');
      return real.call(this, key);
    };
    let failed;
    try {
      failed = await call(p.ownerToken, 'delete', `/api/files/${file.id}`);
    } finally {
      storage.deleteObject = real;
    }
    assert.equal(failed.status, 500, 'the outage is surfaced, never swallowed');
    assert.ok(!JSON.stringify(failed.body).includes('tenants/'), 'no storage key in the error');
    assert.equal(await rowsOf([file.id]), 2, 'the rows still record both keys');
    assert.equal((await call(p.ownerToken, 'get', `/api/files/${file.id}`)).status, 200, 'the file is still there to retry');
    assert.equal(inventory().length, start.length + 1, 'one object went before the outage');

    const retry = await call(p.ownerToken, 'delete', `/api/files/${file.id}`);
    assert.equal(retry.status, 204, JSON.stringify(retry.body));
    assert.deepEqual(inventory(), start);
    assert.equal(await rowsOf([file.id]), 0);
  });

  it('another company and a client of the same company cannot delete; nothing is removed', async () => {
    const start = inventory();
    const foreign = await call(p.ownerBToken, 'delete', `/api/files/${kept.same.id}`);
    assert.equal(foreign.status, 404, 'another company cannot even see the id');
    const client = await call(p.clientToken, 'delete', `/api/files/${kept.same.id}`);
    assert.equal(client.status, 403, 'a client has no delete permission');
    const anonymous = await request(app.getHttpServer()).delete(`/api/files/${kept.same.id}`);
    assert.equal(anonymous.status, 401);
    assert.deepEqual(inventory(), start);
    assert.equal(await rowsOf([kept.same.id]), 2);
    await assertIntact(p.ownerToken, kept.same, 'after the refused deletes');
  });

  it('deleting a project does not orphan: its file, rows and object survive without the project', async () => {
    const project = await prisma.project.create({ data: { tenantId: co.a.id, name: `Doomed project ${RUN}`, status: 'ACTIVE' } });
    const file = await upload(p.ownerToken, project.id, 'survives-project', ['v1']);
    const start = inventory();
    const res = await call(p.ownerToken, 'delete', `/api/projects/${project.id}`);
    assert.equal(res.status, 204, JSON.stringify(res.body));
    assert.deepEqual(inventory(), start, 'no object removed, none left without a row');
    const row = await prisma.fileAsset.findUnique({ where: { id: file.id }, select: { projectId: true } });
    assert.equal(row?.projectId, null);
    assert.equal(await rowsOf([file.id]), 1);
    await assertIntact(p.ownerToken, file, 'after the project is gone');
    // Not an unmanageable leftover: a file without a project is an ordinary
    // state (the upload form offers "No project"), so it stays listed and editable.
    const list = await call(p.ownerToken, 'get', '/api/files');
    assert.equal(list.status, 200);
    const listed = list.body.find((f) => f.id === file.id);
    assert.ok(listed, 'the file stays in the company file list');
    assert.equal(listed.project, null, 'shown without a project');
    const renamed = await call(p.ownerToken, 'patch', `/api/files/${file.id}`, { name: `still managed ${RUN}.txt` });
    assert.equal(renamed.status, 200, JSON.stringify(renamed.body));
    kept.orphanedProject = file;
  });

  it('deleting a task does not orphan either: its file stays listed, readable and deletable', async () => {
    const task = await prisma.task.create({ data: { tenantId: co.a.id, title: `Doomed task ${RUN}`, projectId: co.project.id } });
    const before = inventory();
    const file = await upload(p.ownerToken, co.project.id, 'survives-task', ['v1'], { taskId: task.id });
    const withFile = inventory();
    assert.equal(withFile.length, before.length + 1);
    const res = await call(p.ownerToken, 'delete', `/api/tasks/${task.id}`);
    assert.equal(res.status, 204, JSON.stringify(res.body));
    assert.deepEqual(inventory(), withFile, 'no object removed, none left without a row');
    const row = await prisma.fileAsset.findUnique({ where: { id: file.id }, select: { taskId: true, projectId: true } });
    assert.equal(row?.taskId, null);
    assert.equal(row?.projectId, co.project.id, 'still filed under its project');
    const list = await call(p.ownerToken, 'get', '/api/files');
    assert.ok(list.body.some((f) => f.id === file.id), 'still in the company file list');
    await assertIntact(p.ownerToken, file, 'after the task is gone');
    const removed = await call(p.ownerToken, 'delete', `/api/files/${file.id}`);
    assert.equal(removed.status, 204, JSON.stringify(removed.body));
    assert.deepEqual(inventory(), before, 'and it can be deleted like any other file');
  });

  it('bytes persist across an API restart: a second instance on the same database and store serves them unchanged', async () => {
    const start = inventory();
    await app.close();
    app = await boot();
    assert.deepEqual(inventory(), start, 'a restart writes and removes nothing');
    await assertIntact(p.ownerToken, kept.same, 'same project after the restart');
    await assertIntact(p.ownerBToken, kept.other, 'other company after the restart');
  });

  it('the reconciliation report after the deletes shows no orphan object and no row of these companies without its object', async () => {
    await job.run(prisma, new Date());
    const r = ops.lastStorageReconcile;
    assert.ok(r, 'report recorded');
    assert.equal(r.truncated, false);
    assert.equal(r.objects, inventory().length, 'the report counts what the bucket holds');
    assert.equal(r.orphanObjects, 0, 'every object in the bucket has its row');
    assert.equal(r.orphanBytes, 0);
    // Rows of other suites point at their own stores, so the report's dangling
    // count is not this suite's to judge; its own companies are checked directly.
    const rows = await prisma.fileVersion.findMany({ where: { tenantId: { in: [co.a.id, co.b.id] }, storageKey: { not: null } }, select: { storageKey: true } });
    assert.equal(rows.length, inventory().length, 'one row per object');
    assert.equal(rows.filter((row) => !stub.objects.has(`${BUCKET}/${row.storageKey}`)).length, 0, 'no row without its object');
  });

  it('deleting the remaining files empties the bucket: nothing this suite stored is left behind', async () => {
    for (const [token, file] of [[p.ownerToken, kept.same], [p.ownerBToken, kept.other], [p.ownerToken, kept.orphanedProject]]) {
      const res = await call(token, 'delete', `/api/files/${file.id}`);
      assert.equal(res.status, 204, JSON.stringify(res.body));
    }
    assert.deepEqual(inventory(), []);
    assert.equal(await prisma.fileVersion.count({ where: { tenantId: { in: [co.a.id, co.b.id] } } }), 0);
  });
});
