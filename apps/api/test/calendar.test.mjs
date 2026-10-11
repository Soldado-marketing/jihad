/**
 * Calendar aggregation API (MAOS-T103).
 *
 * GET /calendar?from&to[&types] reads dated items from their own domains
 * (tasks, meetings, follow-ups, approvals, invoices) for a bounded range and
 * stores nothing. Proves: each type appears only for roles that may read it;
 * tasks follow the contractor work scope; another tenant's items never
 * appear; invoices show their number, never an amount, and void invoices are
 * left out; a CLIENT is refused; invalid or oversized ranges are rejected.
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

const RUN = `cl${Date.now().toString(36)}`;
const PASSWORD = 'CalendarPass123!';

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
  // Dated items inside [FROM, TO) and one of each outside it.
  const inRange = new Date('2026-11-10T09:00:00Z');
  const outside = new Date('2026-12-20T09:00:00Z');
  await prisma.task.update({ where: { id: ids.T1a }, data: { dueAt: inRange } });
  await prisma.task.update({ where: { id: ids.T3 }, data: { dueAt: inRange } });
  await prisma.task.update({ where: { id: ids.T2b }, data: { dueAt: outside } });
  await prisma.task.update({ where: { id: ids.FT }, data: { dueAt: inRange } });
  ids.M = (await prisma.meeting.create({ data: { tenantId: t, title: `Kickoff ${RUN}`, scheduledAt: inRange }, select: { id: true } })).id;
  ids.FU = (await prisma.followUp.create({ data: { tenantId: t, title: `Call ${RUN}`, dueAt: inRange }, select: { id: true } })).id;
  ids.AP = (await prisma.approvalRequest.create({ data: { tenantId: t, title: `Sign-off ${RUN}`, dueAt: inRange }, select: { id: true } })).id;
  await prisma.invoice.update({ where: { id: ids.INV }, data: { dueAt: inRange, status: 'SENT', totalCents: 123456 } });
  ids.VOID = (await prisma.invoice.create({ data: { tenantId: t, invoiceNumber: `V-${RUN}`, currency: 'EUR', status: 'VOID', dueAt: inRange }, select: { id: true } })).id;

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

const FROM = '2026-11-01T00:00:00.000Z';
const TO = '2026-12-01T00:00:00.000Z';
const cal = (who, query = `from=${FROM}&to=${TO}`) => get(who, `/api/calendar?${query}`);
const byType = (items, type) => items.filter((e) => e.type === type).map((e) => e.id);

describe('calendar', { skip }, () => {
  it('gives the owner every type in range, nothing outside it, nothing from another tenant', async () => {
    const res = await cal('owner');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const items = res.body.items;
    assert.deepEqual(byType(items, 'task').sort(), [ids.T1a, ids.T3].sort());
    assert.deepEqual(byType(items, 'meeting'), [ids.M]);
    assert.deepEqual(byType(items, 'followUp'), [ids.FU]);
    assert.deepEqual(byType(items, 'approval'), [ids.AP]);
    assert.deepEqual(byType(items, 'invoice'), [ids.INV]);
    const body = JSON.stringify(res.body);
    for (const hidden of [ids.T2b, ids.FT, ids.VOID]) assert.ok(!body.includes(hidden), `leaked ${hidden}`);
    assert.ok(!/1234[.,]?56|123456/.test(body), 'an invoice amount reached the calendar');
  });

  it('shows each type only to roles that may read it', async () => {
    const res = await cal('employee');
    assert.equal(res.status, 200);
    // EMPLOYEE reads tasks and approvals, not meetings, follow-ups or invoices.
    assert.deepEqual(res.body.types.sort(), ['approval', 'task']);
    assert.equal(byType(res.body.items, 'invoice').length, 0);
    assert.equal(byType(res.body.items, 'meeting').length, 0);
  });

  it('keeps a contractor inside their assigned work', async () => {
    const res = await cal('contractor');
    assert.equal(res.status, 200);
    assert.deepEqual(byType(res.body.items, 'task'), [ids.T1a]);
    assert.deepEqual(res.body.types, ['task']);
  });

  it('honours a types filter and rejects unknown types', async () => {
    const res = await cal('owner', `from=${FROM}&to=${TO}&types=meeting,invoice`);
    assert.deepEqual([...new Set(res.body.items.map((e) => e.type))].sort(), ['invoice', 'meeting']);
    assert.equal((await cal('owner', `from=${FROM}&to=${TO}&types=payroll`)).status, 400);
  });

  it('rejects a missing, reversed or oversized range', async () => {
    assert.equal((await cal('owner', '')).status, 400);
    assert.equal((await cal('owner', `from=${TO}&to=${FROM}`)).status, 400);
    assert.equal((await cal('owner', 'from=2026-01-01T00:00:00Z&to=2026-06-01T00:00:00Z')).status, 400);
  });

  it('refuses a CLIENT and needs a session', async () => {
    assert.equal((await cal('client')).status, 403);
    assert.equal((await request(server).get(`/api/calendar?from=${FROM}&to=${TO}`)).status, 401);
  });
});
