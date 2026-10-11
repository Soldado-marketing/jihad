/**
 * Activity timeline API (MAOS-T65).
 *
 * GET /activity/:resourceType/:resourceId reads AuditEvent for one resource.
 * Proves: the caller needs read permission on that resource type (a CLIENT is
 * refused - audit events are internal); the resource must be visible to the
 * caller (another tenant's id, or a task outside a contractor's assigned
 * work, is 404); a file's timeline includes its versions; and no event
 * payload, permission result or session data is ever returned.
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

const RUN = `at${Date.now().toString(36)}`;
const PASSWORD = 'ActivityPass123!';

let app;
let server;
let request;
let prisma;
const tokens = {};
const ids = {};
let tenant;
const users = {};

async function seedTenant(label) {
  return prisma.tenant.create({ data: { name: `${label} ${RUN}`, slug: `${label}-${RUN}`, status: 'ACTIVE' }, select: { id: true, slug: true } });
}

async function seedUser(tenantId, label, role, membershipStatus = 'ACTIVE') {
  const bcrypt = require('bcrypt');
  const user = await prisma.user.create({
    data: { email: `${label}-${RUN}@example.test`, displayName: label, passwordHash: await bcrypt.hash(PASSWORD, 10), status: 'APPROVED' },
    select: { id: true, email: true },
  });
  await prisma.tenantMembership.create({
    data: { tenantId, userId: user.id, role, status: membershipStatus, visibilityScope: 'TENANT_WIDE' },
  });
  return user;
}

const as = (who, req) => req.set('Authorization', `Bearer ${tokens[who]}`);
const NON_EXISTENT = 'cxxxxxxxxxxxxxxxxxxxxxxxx';

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
  // Listen once on IPv4 loopback (CI-2): supertest otherwise re-listens on a
  // fresh ephemeral port per request, and on a developer machine another
  // local process occasionally answered that port.
  await app.listen(0, '127.0.0.1');
  server = app.getHttpServer();
  request = require('supertest');
  const { PrismaService } = require(join(apiRoot, 'dist/modules/prisma/prisma.service.js'));
  prisma = app.get(PrismaService);

  tenant = await seedTenant('acme');
  const t = tenant.id;
  users.owner = await seedUser(t, 'owner', 'OWNER');
  users.contractor = await seedUser(t, 'contractor', 'CONTRACTOR');
  users.employee = await seedUser(t, 'employee', 'EMPLOYEE');
  users.client = await seedUser(t, 'client', 'CLIENT');
  await prisma.tenantMembership.updateMany({ where: { tenantId: t, userId: users.client.id }, data: { clientScopeKey: `acme-${RUN}` } });
  const C = users.contractor.id;
  const E = users.employee.id;

  const project = (name) => prisma.project.create({ data: { tenantId: t, name: `${name} ${RUN}` }, select: { id: true } });
  const task = (title, projectId, assignedToUserId) =>
    prisma.task.create({ data: { tenantId: t, title: `${title} ${RUN}`, projectId, assignedToUserId }, select: { id: true } });
  const file = (name, data) => prisma.fileAsset.create({ data: { tenantId: t, name: `${name}-${RUN}.pdf`, ...data }, select: { id: true } });

  ids.P1 = (await project('Member project')).id; // contractor is a ProjectMember
  ids.P2 = (await project('Assigned-task project')).id; // contractor only has one task here
  ids.P3 = (await project('Unrelated project')).id;
  await prisma.projectMember.create({ data: { tenantId: t, projectId: ids.P1, userId: C, role: 'CONTRACTOR' } });

  ids.T1a = (await task('P1 open task', ids.P1, null)).id;
  ids.T2a = (await task('P2 contractor task', ids.P2, C)).id;
  ids.T2b = (await task('P2 employee task', ids.P2, E)).id;
  ids.T3 = (await task('P3 task', ids.P3, null)).id;
  ids.T0 = (await task('Loose contractor task', null, C)).id;
  ids.T0b = (await task('Loose other task', null, null)).id;
  ids.S2b = (await prisma.subtask.create({ data: { tenantId: t, taskId: ids.T2b, title: `Hidden subtask ${RUN}` }, select: { id: true } })).id;

  ids.F1 = (await file('p1', { projectId: ids.P1 })).id;
  ids.F2 = (await file('t2a', { taskId: ids.T2a })).id;
  ids.F2b = (await file('t2b', { taskId: ids.T2b })).id;
  ids.F3 = (await file('p3', { projectId: ids.P3 })).id;
  await prisma.fileVersion.create({ data: { tenantId: t, fileAssetId: ids.F1, versionNumber: 1 } });
  await prisma.fileVersion.create({ data: { tenantId: t, fileAssetId: ids.F3, versionNumber: 1 } });

  const other = await seedTenant('other');
  ids.FT = (await prisma.task.create({ data: { tenantId: other.id, title: `Foreign ${RUN}` }, select: { id: true } })).id;
  ids.V1 = (await prisma.fileVersion.findFirst({ where: { fileAssetId: ids.F1 }, select: { id: true } })).id;
  ids.INV = (await prisma.invoice.create({ data: { tenantId: t, invoiceNumber: `A-${RUN}`, currency: 'EUR' }, select: { id: true } })).id;
  const event = (resourceType, resourceId, action, tenantId = t, extra = {}) =>
    prisma.auditEvent.create({
      data: {
        tenantId, resourceType, resourceId, action, outcome: 'SUCCESS', actorId: users.owner.id,
        permissionResult: 'ALLOWED', redactedPayload: { secretNote: `internal-${RUN}` }, ...extra,
      },
    });
  await event('task', ids.T1a, 'task.updated');
  await event('task', ids.T3, 'task.updated');
  await event('file-version', ids.V1, 'file.version.upload');
  await event('invoice', ids.INV, 'invoice.sent');
  await event('task', ids.FT, 'task.updated', other.id);
  // Defence in depth: an event in another tenant that names our task's id.
  await event('task', ids.T1a, 'foreign.planted', other.id);

  for (const who of ['owner', 'contractor', 'employee', 'client']) {
    const res = await request(server)
      .post('/api/auth/login')
      .send({ email: users[who].email, passwordOrMagicCode: PASSWORD, tenantSlug: tenant.slug });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    tokens[who] = res.body.tokens.accessToken;
  }
});

after(async () => {
  if (app) await app.close();
});

const get = (who, path) => as(who, request(server).get(path));
const listIds = async (who, path) => {
  const res = await get(who, path);
  assert.equal(res.status, 200, `${who} ${path}: ${JSON.stringify(res.body)}`);
  const items = Array.isArray(res.body) ? res.body : res.body.items;
  return new Set(items.map((x) => x.id));
};
const assertSet = (actual, included, excluded, label) => {
  for (const k of included) assert.ok(actual.has(ids[k]), `${label}: ${k} missing`);
  for (const k of excluded) assert.ok(!actual.has(ids[k]), `${label}: ${k} must not be visible`);
};

const timeline = (who, type, id) => get(who, `/api/activity/${type}/${id}`);

describe('activity timeline', { skip }, () => {
  it('returns a resource\'s events, newest first, without payload or internals', async () => {
    const res = await timeline('owner', 'task', ids.T1a);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(res.body.items.map((e) => e.action), ['task.updated']);
    const body = JSON.stringify(res.body);
    for (const hidden of ['secretNote', `internal-${RUN}`, 'redactedPayload', 'permissionResult', 'sessionId', 'deviceId']) {
      assert.ok(!body.includes(hidden), `leaked ${hidden}`);
    }
    assert.equal(res.body.items[0].actor.id, users.owner.id);
  });

  it('includes a file\'s version events in the file timeline', async () => {
    const res = await timeline('owner', 'file', ids.F1);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.items.map((e) => e.action), ['file.version.upload']);
  });

  it('refuses a CLIENT (403): audit events are internal', async () => {
    assert.equal((await timeline('client', 'task', ids.T1a)).status, 403);
    assert.equal((await timeline('client', 'project', ids.P1)).status, 403);
  });

  it('refuses a role without read permission on the type', async () => {
    // EMPLOYEE has no INVOICE read by default.
    assert.equal((await timeline('employee', 'invoice', ids.INV)).status, 403);
    assert.equal((await timeline('owner', 'invoice', ids.INV)).status, 200);
  });

  it('answers 404 for another tenant\'s resource and leaks none of its events', async () => {
    const res = await timeline('owner', 'task', ids.FT);
    assert.equal(res.status, 404);
    assert.ok(!JSON.stringify(res.body).includes(ids.FT));
  });

  it('keeps a contractor inside their assigned work', async () => {
    assert.equal((await timeline('contractor', 'task', ids.T1a)).status, 200);
    assert.equal((await timeline('contractor', 'task', ids.T3)).status, 404);
  });

  it('rejects an unsupported resource type and needs a session', async () => {
    assert.equal((await timeline('owner', 'user', users.owner.id)).status, 400);
    assert.equal((await request(server).get(`/api/activity/task/${ids.T1a}`)).status, 401);
  });
});
