/**
 * Notification writers (MAOS-T47, re-applied from feat/v2-a1-notifications).
 *
 * The bell had read endpoints but nothing ever wrote a row. Six events now
 * notify, through one writer (NotificationsService.notify) with three
 * invariants this suite proves over HTTP:
 *   - audience: INTERNAL events never reach a CLIENT; the actor is never told
 *     about their own action; each event reaches exactly its intended roles;
 *   - tenant: recipients are re-checked against the tenant membership, and one
 *     tenant never sees another's notifications;
 *   - payload: no amounts; a replayed event does not create a second row.
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

const RUN = `nw${Date.now().toString(36)}`;
const PASSWORD = 'NotifyPass123!';

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
  token = people.owner.token;
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

describe('notification writers', { skip }, () => {
  it('tells an approved applicant directly - even a CLIENT - about their own approval', async () => {
    const r = await pendingRequest('CLIENT');
    await prisma.user.update({ where: { id: r.userId }, data: { passwordHash: await require('bcrypt').hash(PASSWORD, 10) } });
    const res = await approve(r.requestId, { role: 'CLIENT', clientScopeKey: `acme-${RUN}` });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const rows = await prisma.notification.findMany({ where: { tenantId, recipientUserId: r.userId } });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].resourceType, 'registrationRequest');
  });

  it('approval requested: OWNER and MANAGER are told, never the requester, a CLIENT or a CONTRACTOR', async () => {
    // A manager raises it (employees may only read approvals).
    const res = await as('manager', request(server).post('/api/approvals')).send({ title: `Sign-off ${RUN}` });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const id = res.body.id;
    assert.equal((await about('owner', 'approval', id)).length, 1);
    for (const who of ['manager', 'employee', 'client', 'contractor']) {
      assert.equal((await about(who, 'approval', id)).length, 0, `${who} was told`);
    }
    people.approvalId = id;
  });

  it('approval decided: the requester is told in plain words, the decider is not', async () => {
    const id = people.approvalId;
    const res = await as('owner', request(server).post(`/api/approvals/${id}/decision`)).send({ decision: 'APPROVE' });
    assert.ok([200, 201].includes(res.status), JSON.stringify(res.body));
    const toRequester = await about('manager', 'approval', id);
    assert.deepEqual(toRequester.map((n) => n.title), ['Approval approved']);
    assert.equal((await about('owner', 'approval', id)).length, 1, 'only the request notification');
  });

  it('payment recorded: only OWNER is told, and the body carries no amount', async () => {
    const inv = await prisma.invoice.create({
      data: { tenantId, invoiceNumber: `N-${RUN}`, currency: 'EUR', status: 'SENT', totalCents: 12345 },
      select: { id: true },
    });
    const res = await as('manager', request(server).post('/api/payments')).send({ invoiceId: inv.id, amountCents: 2345, currency: 'EUR' });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const paymentId = res.body.payment.id;
    const [n] = await about('owner', 'payment', paymentId);
    assert.ok(n, 'owner was not told');
    assert.doesNotMatch(`${n.title} ${n.body}`, /23[.,]?45|123[.,]?45|\bcents?\b|EUR\s*\d/i);
    for (const who of ['manager', 'employee', 'contractor', 'client']) {
      assert.equal((await about(who, 'payment', paymentId)).length, 0, `${who} was told about a payment`);
    }
  });

  it('task assigned: the assignee is told once; re-saving or re-assigning back does not repeat it', async () => {
    const res = await as('owner', request(server).post('/api/tasks')).send({ title: `Draft copy ${RUN}`, assignedToUserId: people.contractor.id });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const id = res.body.id;
    assert.equal((await about('contractor', 'task', id)).length, 1);

    const patch = (assignedToUserId) => as('owner', request(server).patch(`/api/tasks/${id}`)).send({ assignedToUserId });
    assert.equal((await patch(people.contractor.id)).status, 200);
    assert.equal((await patch(people.employee.id)).status, 200);
    assert.equal((await patch(people.contractor.id)).status, 200);
    assert.equal((await about('contractor', 'task', id)).length, 1, 'duplicate assignment notification');
    assert.equal((await about('employee', 'task', id)).length, 1);
  });

  it('never tells a CLIENT about internal work, even when assigned', async () => {
    const res = await as('owner', request(server).post('/api/tasks')).send({ title: `Internal ${RUN}`, assignedToUserId: people.client.id });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal((await about('client', 'task', res.body.id)).length, 0);
  });

  it('drops a named recipient who is not a member of the tenant (cross-tenant guard)', async () => {
    const { NotificationsService } = require(join(apiRoot, 'dist/modules/notifications/notifications.service.js'));
    const created = await app.get(NotificationsService).notify({
      tenantId,
      recipientUserIds: [people.foreign.id],
      audience: 'DIRECT',
      dedupeKey: `probe:${RUN}`,
      title: 'Probe',
    });
    assert.equal(created, 0);
    assert.deepEqual(await bell('foreign'), []);
  });

  it('keeps every notification inside its tenant and its recipient', async () => {
    assert.deepEqual(await bell('foreign'), []);
    const rows = await prisma.notification.findMany({ where: { tenantId }, select: { recipientUserId: true } });
    const members = new Set(
      (await prisma.tenantMembership.findMany({ where: { tenantId }, select: { userId: true } })).map((m) => m.userId),
    );
    for (const row of rows) assert.ok(members.has(row.recipientUserId), 'a notification left the tenant');
    const ownerIds = new Set((await bell('owner')).map((n) => n.id));
    for (const n of await bell('employee')) assert.ok(!ownerIds.has(n.id), 'one user sees another user\'s notification');
  });
});
