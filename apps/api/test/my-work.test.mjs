/**
 * My Work (MAOS-T67): GET /my-work returns only the caller's own work.
 *
 * Proves: tasks are bucketed by due date (overdue, due soon, open) with
 * blocked separate and done hidden; only tasks assigned to the caller, never
 * a colleague's or another tenant's; approvals waiting for a decision only for
 * roles that may decide, excluding the caller's own requests; follow-ups only
 * the caller's own; the caller's unread notifications; a CLIENT is refused.
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

const RUN = `mw${Date.now().toString(36)}`;
const PASSWORD = 'MyWorkPass123!';

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
  // Listen once on IPv4 loopback (CI-2): supertest otherwise re-listens on a
  // fresh ephemeral port per request, and on a developer machine another
  // local process occasionally answered that port.
  await app.listen(0, '127.0.0.1');
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

  // Work for the contractor and the owner, with due dates around "now".
  const day = 24 * 60 * 60 * 1000;
  const at = (days) => new Date(Date.now() + days * day);
  const task = (title, assignee, extra = {}) =>
    prisma.task.create({ data: { tenantId, title: `${title} ${RUN}`, assignedToUserId: assignee, ...extra }, select: { id: true } });
  ids.overdue = (await task('Overdue', people.contractor.id, { dueAt: at(-2) })).id;
  ids.soon = (await task('Due soon', people.contractor.id, { dueAt: at(3) })).id;
  ids.later = (await task('Later', people.contractor.id, { dueAt: at(30) })).id;
  ids.blocked = (await task('Blocked', people.contractor.id, { status: 'BLOCKED', dueAt: at(-1) })).id;
  ids.done = (await task('Done', people.contractor.id, { status: 'DONE', dueAt: at(-5) })).id;
  ids.others = (await task('Someone else', people.employee.id, { dueAt: at(-2) })).id;
  ids.foreignTask = (await prisma.task.create({ data: { tenantId: other.id, title: `Foreign ${RUN}`, assignedToUserId: people.foreign.id }, select: { id: true } })).id;

  ids.approvalFromManager = (await prisma.approvalRequest.create({
    data: { tenantId, title: `Needs owner ${RUN}`, requestedByUserId: people.manager.id }, select: { id: true },
  })).id;
  ids.approvalFromOwner = (await prisma.approvalRequest.create({
    data: { tenantId, title: `Owner asked ${RUN}`, requestedByUserId: people.owner.id }, select: { id: true },
  })).id;
  ids.followUp = (await prisma.followUp.create({
    data: { tenantId, title: `Call back ${RUN}`, ownerUserId: people.owner.id, dueAt: at(1) }, select: { id: true },
  })).id;
  ids.followUpOther = (await prisma.followUp.create({
    data: { tenantId, title: `Not mine ${RUN}`, ownerUserId: people.manager.id, dueAt: at(1) }, select: { id: true },
  })).id;
  await prisma.notification.create({
    data: { tenantId, recipientUserId: people.contractor.id, title: `Ping ${RUN}` },
  });
  token = people.owner.token;
});

after(async () => {
  if (app) await app.close();
});

const people = {};
const ids = {};
const as = (who, req) => req.set('Authorization', `Bearer ${people[who].token}`);
const bell = async (who) => {
  const res = await as(who, request(server).get('/api/notifications'));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body;
};
const about = async (who, resourceType, resourceId) =>
  (await bell(who)).filter((n) => n.resourceType === resourceType && (!resourceId || n.resourceId === resourceId));

const myWork = async (who) => {
  const res = await as(who, request(server).get('/api/my-work'));
  return res;
};
const idsOf = (list) => list.map((x) => x.id);

describe('my work', { skip }, () => {
  it('buckets the caller\'s own tasks and hides done and other people\'s work', async () => {
    const res = await myWork('contractor');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const t = res.body.tasks;
    assert.deepEqual(idsOf(t.overdue), [ids.overdue]);
    assert.deepEqual(idsOf(t.dueSoon), [ids.soon]);
    assert.deepEqual(idsOf(t.blocked), [ids.blocked]);
    assert.deepEqual(idsOf(t.open), [ids.later]);
    const all = JSON.stringify(res.body);
    for (const hidden of [ids.done, ids.others, ids.foreignTask]) assert.ok(!all.includes(hidden), `leaked ${hidden}`);
  });

  it('shows a contractor no approvals or follow-ups (no permission), but their notifications', async () => {
    const res = await myWork('contractor');
    assert.deepEqual(res.body.approvals, { toDecide: [], requested: [] });
    assert.deepEqual(res.body.followUps, []);
    assert.equal(res.body.notifications.unread, 1);
    assert.equal(res.body.notifications.latest.length, 1);
  });

  it('lists approvals the owner can decide, separately from the owner\'s own requests', async () => {
    const res = await myWork('owner');
    assert.equal(res.status, 200);
    assert.ok(idsOf(res.body.approvals.toDecide).includes(ids.approvalFromManager));
    assert.ok(!idsOf(res.body.approvals.toDecide).includes(ids.approvalFromOwner));
    assert.deepEqual(idsOf(res.body.approvals.requested), [ids.approvalFromOwner]);
    assert.deepEqual(idsOf(res.body.followUps), [ids.followUp]);
    assert.equal(res.body.notifications.unread, 0, 'never another user\'s notifications');
  });

  it('refuses a CLIENT and stays inside the tenant', async () => {
    assert.equal((await myWork('client')).status, 403);
    const foreign = await myWork('foreign');
    assert.equal(foreign.status, 200);
    const t = foreign.body.tasks;
    assert.ok(!JSON.stringify(foreign.body).includes(RUN) || idsOf([...t.open, ...t.overdue]).every((id) => id === ids.foreignTask));
    assert.ok(!JSON.stringify(foreign.body).includes(ids.approvalFromManager));
  });

  it('needs a session', async () => {
    assert.equal((await request(server).get('/api/my-work')).status, 401);
  });
});
