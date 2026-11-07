/**
 * B06 operational alerts: a scheduled job that failed or went silent, and an
 * object store above its limit, become one in-app notice per owner of every
 * active company (never a client); GET /health/ops shows the state to the
 * OWNER only. Real Nest HTTP + isolated test database.
 * Run with MAOS_INTEGRATION=1, DATABASE_URL and JWT_SECRET, after migrations.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { before, after, describe, it } from 'node:test';

process.env.S3_BUCKET ||= 'ops-test-bucket';
process.env.S3_REGION ||= 'eu-central-1';
process.env.S3_ACCESS_KEY_ID ||= 'ops';
process.env.S3_SECRET_ACCESS_KEY ||= 'ops';
process.env.S3_ENDPOINT = 'http://127.0.0.1:9';
process.env.S3_FORCE_PATH_STYLE = 'true';

const require = createRequire(import.meta.url);
const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const skip = process.env.MAOS_INTEGRATION !== '1' || !existsSync(join(apiRoot, 'dist/app.module.js'));
const RUN = 'ops' + Date.now().toString(36);
const PASSWORD = 'OpsAlertsTest123!';
const HOUR = 3600 * 1000;

let app, server, request, prisma, watchdog, capacity, storage, ops;
const co = {}; const p = {};

async function member(tenant, role, label) {
  const bcrypt = require('bcrypt');
  const user = await prisma.user.create({ data: { email: `${label}-${RUN}@example.test`, displayName: `${label} ${RUN}`, passwordHash: await bcrypt.hash(PASSWORD, 10), status: 'APPROVED' } });
  await prisma.tenantMembership.create({ data: { tenantId: tenant.id, userId: user.id, role, status: 'ACTIVE', visibilityScope: role === 'CLIENT' ? 'CLIENT_LEVEL' : 'TENANT_WIDE', clientScopeKey: role === 'CLIENT' ? `c-${RUN}` : null } });
  return { id: user.id, email: user.email };
}
let ip = 0;
async function login(person, tenant) {
  const res = await request(server).post('/api/auth/login').set('X-Forwarded-For', `198.51.100.${++ip}`).send({ email: person.email, passwordOrMagicCode: PASSWORD, tenantSlug: tenant.slug });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.tokens.accessToken;
}
const noticesFor = (userId, title) => prisma.notification.count({ where: { recipientUserId: userId, title } });
const status = (name, over) => ({ name, everyMs: HOUR, runs: 3, failures: 1, lastOutcome: 'succeeded', lastFinishedAt: new Date().toISOString(), ...over });

before(async () => {
  if (skip) return;
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
  server = app.getHttpServer();
  request = require('supertest');
  prisma = app.get(require(join(apiRoot, 'dist/modules/prisma/prisma.service.js')).PrismaService);
  watchdog = app.get(require(join(apiRoot, 'dist/modules/scheduler/jobs/ops-watchdog.job.js')).OpsWatchdogJob);
  capacity = app.get(require(join(apiRoot, 'dist/modules/scheduler/jobs/storage-capacity.job.js')).StorageCapacityJob);
  storage = app.get(require(join(apiRoot, 'dist/modules/storage/storage.service.js')).StorageService);
  ops = app.get(require(join(apiRoot, 'dist/modules/scheduler/ops-alerts.service.js')).OpsAlertsService);

  co.a = await prisma.tenant.create({ data: { name: `Ops A ${RUN}`, slug: `${RUN}-a`, status: 'ACTIVE' } });
  process.env.MAOS_OPS_TENANT_SLUG = co.a.slug; // the platform's own company for this suite; other suites' companies are never addressed
  co.b = await prisma.tenant.create({ data: { name: `Ops B ${RUN}`, slug: `${RUN}-b`, status: 'ACTIVE' } });
  co.s = await prisma.tenant.create({ data: { name: `Ops S ${RUN}`, slug: `${RUN}-s`, status: 'SUSPENDED' } });
  p.owner = await member(co.a, 'OWNER', 'owner'); p.manager = await member(co.a, 'MANAGER', 'manager'); p.client = await member(co.a, 'CLIENT', 'client');
  p.ownerB = await member(co.b, 'OWNER', 'ownerb'); p.ownerS = await member(co.s, 'OWNER', 'owners');
  p.ownerToken = await login(p.owner, co.a); p.managerToken = await login(p.manager, co.a);
});
after(async () => { delete process.env.MAOS_OPS_TENANT_SLUG; if (app) await app.close(); });

describe('ops watchdog', { skip }, () => {
  it('a failed job becomes one notice per owner of the ops company, never another company, a manager or a client', async () => {
    const failedAt = new Date().toISOString();
    const n = await watchdog.run(prisma, new Date(), [status('deadline-reminders', { lastOutcome: 'failed', lastFinishedAt: failedAt })]);
    assert.equal(n, 1, 'owner of the ops company only');
    assert.equal(await noticesFor(p.owner.id, 'Scheduled job failed'), 1);
    assert.equal(await noticesFor(p.ownerB.id, 'Scheduled job failed'), 0, 'another company never hears about the platform');
    assert.equal(await noticesFor(p.ownerS.id, 'Scheduled job failed'), 0, 'suspended company gets nothing');
    assert.equal(await noticesFor(p.manager.id, 'Scheduled job failed'), 0);
    assert.equal(await noticesFor(p.client.id, 'Scheduled job failed'), 0);
    const again = await watchdog.run(prisma, new Date(), [status('deadline-reminders', { lastOutcome: 'failed', lastFinishedAt: failedAt })]);
    assert.equal(again, 0, 'same failure, no second notice');
    assert.deepEqual(ops.lastFindings.map((f) => f.kind), ['failed']);
  });

  it('a job that has not finished for twice its interval is reported silent, once per hour', async () => {
    const stale = new Date(Date.now() - 3 * HOUR).toISOString();
    const now = new Date();
    const n = await watchdog.run(prisma, now, [status('appointment-reminders', { lastFinishedAt: stale })]);
    assert.equal(n, 1);
    assert.equal(await noticesFor(p.owner.id, 'Scheduled job is silent'), 1);
    assert.equal(await noticesFor(p.ownerB.id, 'Scheduled job is silent'), 0);
    assert.equal(await watchdog.run(prisma, now, [status('appointment-reminders', { lastFinishedAt: stale })]), 0);
    const healthy = await watchdog.run(prisma, now, [status('invite-expiry', {})]);
    assert.equal(healthy, 0, 'a healthy job raises nothing');
  });

  it('is registered on the scheduler with the storage check', () => {
    const names = app.get(require(join(apiRoot, 'dist/modules/scheduler/scheduler.service.js')).SchedulerService).status().map((s) => s.name);
    assert.ok(names.includes('ops-watchdog') && names.includes('storage-capacity') && names.includes('storage-reconcile'), names.join(','));
  });
});

describe('storage capacity', { skip }, () => {
  it('above the limit the owners get one notice per day; below nothing', async () => {
    const original = storage.countObjects;
    try {
      storage.countObjects = async () => ({ objects: 10, bytes: 6 * 1024 ** 3, truncated: false });
      const day = new Date();
      assert.equal(await capacity.run(prisma, day), 1);
      assert.equal(await noticesFor(p.ownerB.id, 'Storage is above its limit'), 0);
      assert.equal(await noticesFor(p.owner.id, 'Storage is above its limit'), 1);
      assert.equal(await capacity.run(prisma, day), 0, 'same day, no second notice');
      assert.equal(ops.lastStorageCheck.exceeded, true);
      storage.countObjects = async () => ({ objects: 10, bytes: 1024, truncated: false });
      assert.equal(await capacity.run(prisma, new Date(day.getTime() + 24 * HOUR)), 0);
      assert.equal(ops.lastStorageCheck.exceeded, false);
    } finally {
      storage.countObjects = original;
    }
  });
});

describe('GET /health/ops', { skip }, () => {
  it('is OWNER-only and shows status words and numbers only', async () => {
    assert.equal((await request(server).get('/api/health/ops')).status, 401);
    assert.equal((await request(server).get('/api/health/ops').set('Authorization', `Bearer ${p.managerToken}`)).status, 403);
    const res = await request(server).get('/api/health/ops').set('Authorization', `Bearer ${p.ownerToken}`);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok(Array.isArray(res.body.jobs) && res.body.jobs.some((j) => j.name === 'ops-watchdog'));
    assert.equal(typeof res.body.schedulerEnabled, 'boolean');
    assert.equal(res.body.opsCompanyConfigured, true);
    assert.equal(res.body.storage.exceeded, false);
    assert.ok(Array.isArray(res.body.watchdog.findings));
    const text = JSON.stringify(res.body);
    assert.doesNotMatch(text, /S3_|secret|password|postgres|Bucket|ops-test-bucket/i);
  });
});
