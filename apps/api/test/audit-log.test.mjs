/**
 * Audit log for the Audit UI (MAOS-T132): GET /audit-events.
 *
 * Proves: OWNER only (every other role 403, no session 401); only the
 * caller's tenant; newest first; filters by action prefix, resource type,
 * actor and outcome; cursor paging that neither skips nor repeats events
 * sharing a timestamp; no session or device identifiers.
 *
 * Prerequisites (otherwise the whole suite skips rather than failing):
 *   npm run build; migrated PostgreSQL; DATABASE_URL + JWT_SECRET; MAOS_INTEGRATION=1.
 */

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const enabled = process.env.MAOS_INTEGRATION === '1';
const built = existsSync(join(apiRoot, 'dist/app.module.js'));
const configured = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET);
const skip = !enabled
  ? 'set MAOS_INTEGRATION=1 to run'
  : !built
    ? 'run `npm run build` first'
    : !configured
      ? 'DATABASE_URL and JWT_SECRET must be set'
      : false;

const RUN = `al${Date.now().toString(36)}`;
const PASSWORD = 'AuditLogPass123!';

let app;
let server;
let request;
let prisma;
let token = '';
let tenantId = '';
let n = 0;

async function pendingRequest(requestedRole) {
  n += 1;
  const user = await prisma.user.create({
    data: {
      email: `applicant${n}-${RUN}@example.test`,
      displayName: `applicant ${n}`,
      status: 'PENDING_APPROVAL',
      passwordHash: await require('bcrypt').hash(PASSWORD, 10),
    },
    select: { id: true },
  });
  const req = await prisma.registrationRequest.create({
    data: { userId: user.id, tenantId, fullName: `Applicant ${n}`, requestedRole },
    select: { id: true },
  });
  return { userId: user.id, requestId: req.id, email: `applicant${n}-${RUN}@example.test` };
}

const approve = (requestId, body) =>
  request(server).post(`/api/admin/users/requests/${requestId}/approve`).set('Authorization', `Bearer ${token}`).send(body);


before(async () => {
  if (skip) return;
  require('reflect-metadata');
  const { NestFactory } = require('@nestjs/core');
  const { ValidationPipe } = require('@nestjs/common');
  const { AppModule } = require(join(apiRoot, 'dist/app.module.js'));
  const { AllExceptionsFilter } = require(join(apiRoot, 'dist/common/http/all-exceptions.filter.js'));
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));
  await app.init();
  server = app.getHttpServer();
  request = require('supertest');
  const { PrismaService } = require(join(apiRoot, 'dist/modules/prisma/prisma.service.js'));
  prisma = app.get(PrismaService);

  const bcrypt = require('bcrypt');
  const hash = await bcrypt.hash(PASSWORD, 10);
  const tenant = await prisma.tenant.create({ data: { name: `Tenant ${RUN}`, slug: `tenant-${RUN}`, status: 'ACTIVE' }, select: { id: true } });
  tenantId = tenant.id;
  const other = await prisma.tenant.create({ data: { name: `Other ${RUN}`, slug: `other-${RUN}`, status: 'ACTIVE' }, select: { id: true } });

  async function member(tid, slug, label, role, clientScopeKey) {
    const email = `${label}-${RUN}@example.test`;
    const user = await prisma.user.create({ data: { email, displayName: label, passwordHash: hash, status: 'APPROVED' }, select: { id: true } });
    await prisma.tenantMembership.create({
      data: { tenantId: tid, userId: user.id, role, status: 'ACTIVE', visibilityScope: 'TENANT_WIDE', clientScopeKey },
    });
    const res = await request(server).post('/api/auth/login').send({ email, passwordOrMagicCode: PASSWORD, tenantSlug: slug });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return { id: user.id, token: res.body.tokens.accessToken };
  }
  for (const [label, role, key] of [
    ['owner', 'OWNER'],
    ['manager', 'MANAGER'],
    ['employee', 'EMPLOYEE'],
    ['contractor', 'CONTRACTOR'],
    ['client', 'CLIENT', `acme-${RUN}`],
  ]) {
    people[label] = await member(tenantId, `tenant-${RUN}`, label, role, key);
  }
  people.foreign = await member(other.id, `other-${RUN}`, 'foreign', 'OWNER');
  token = people.owner.token;

  // 120 events sharing one timestamp (cursor correctness), a failure, and a
  // foreign tenant's event.
  const at = new Date('2026-10-01T10:00:00.000Z');
  await prisma.auditEvent.createMany({
    data: Array.from({ length: 120 }, (_, i) => ({
      tenantId, action: 'task.updated', resourceType: 'task', resourceId: `t${i}`, outcome: 'SUCCESS',
      actorId: people.manager.id, createdAt: at, sessionId: null,
    })),
  });
  await prisma.auditEvent.create({
    data: { tenantId, action: 'invoice.sent', resourceType: 'invoice', resourceId: 'inv', outcome: 'FAILURE', actorId: people.owner.id, createdAt: new Date('2026-10-02T10:00:00Z') },
  });
  await prisma.auditEvent.create({
    data: { tenantId: other.id, action: 'secret.foreign', resourceType: 'task', resourceId: 'x', outcome: 'SUCCESS' },
  });
});

after(async () => {
  if (app) await app.close();
});

const people = {};
const as = (who, req) => req.set('Authorization', `Bearer ${people[who].token}`);
const bell = async (who) => {
  const res = await as(who, request(server).get('/api/notifications'));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body;
};
const about = async (who, resourceType, resourceId) =>
  (await bell(who)).filter((n) => n.resourceType === resourceType && (!resourceId || n.resourceId === resourceId));

const log = (who, qs = '') => as(who, request(server).get(`/api/audit-events${qs}`));

describe('audit log', { skip }, () => {
  it('is OWNER-only', async () => {
    for (const who of ['manager', 'employee', 'contractor', 'client']) {
      assert.equal((await log(who)).status, 403, who);
    }
    assert.equal((await request(server).get('/api/audit-events')).status, 401);
  });

  it('lists only this tenant, newest first, without session or device ids', async () => {
    const res = await log('owner');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.items[0].action, 'invoice.sent');
    const body = JSON.stringify(res.body);
    assert.ok(!body.includes('secret.foreign'), 'another tenant\'s event leaked');
    assert.ok(!/sessionId|deviceId/.test(body));
  });

  it('pages through events with equal timestamps without skipping or repeating', async () => {
    const seen = [];
    let qs = '?action=task.updated';
    for (let page = 0; page < 5; page += 1) {
      const res = await log('owner', qs);
      assert.equal(res.status, 200);
      seen.push(...res.body.items.map((e) => e.id));
      if (!res.body.nextBefore) break;
      qs = `?action=task.updated&before=${encodeURIComponent(res.body.nextBefore)}`;
    }
    assert.equal(seen.length, 120);
    assert.equal(new Set(seen).size, 120);
  });

  it('filters by resource type, actor and outcome, and rejects bad input', async () => {
    assert.ok((await log('owner', '?resourceType=invoice')).body.items.every((e) => e.resourceType === 'invoice'));
    const byActor = await log('owner', `?actorId=${people.owner.id}`);
    assert.ok(byActor.body.items.length >= 1 && byActor.body.items.every((e) => e.actor?.id === people.owner.id));
    assert.deepEqual((await log('owner', '?outcome=FAILURE')).body.items.map((e) => e.action), ['invoice.sent']);
    assert.equal((await log('owner', '?outcome=MAYBE')).status, 400);
    assert.equal((await log('owner', '?before=nonsense')).status, 400);
  });
});
