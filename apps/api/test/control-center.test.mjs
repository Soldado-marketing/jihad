/**
 * Owner Control Center (GET /api/dashboards/control-center): real Nest HTTP +
 * isolated test database. Only companies where the caller is an ACTIVE OWNER
 * are included, every role below OWNER is refused, revoked memberships drop
 * out at once, and viewing never switches the caller's company.
 * Run with MAOS_INTEGRATION=1, DATABASE_URL and JWT_SECRET, after migrations.
 * Requires a TEST database only; never point this suite at production.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { before, after, describe, it } from 'node:test';

const require = createRequire(import.meta.url);
const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const skip = process.env.MAOS_INTEGRATION !== '1' || !existsSync(join(apiRoot, 'dist/app.module.js'));
const RUN = 'cc' + Date.now().toString(36);
const PASSWORD = 'ControlCenterTest123!';
const DAY = 24 * 60 * 60 * 1000;

let app, server, request, prisma;
const co = {};
const people = {};
const rec = {};

async function member(tenant, role, email, existingUserId, extra = {}) {
  const bcrypt = require('bcrypt');
  const user = existingUserId
    ? await prisma.user.findUnique({ where: { id: existingUserId } })
    : await prisma.user.create({
      data: { email, displayName: role + ' ' + RUN, passwordHash: await bcrypt.hash(PASSWORD, 10), status: 'APPROVED' },
    });
  const membership = await prisma.tenantMembership.create({
    data: { tenantId: tenant.id, userId: user.id, role, status: 'ACTIVE', ...extra },
  });
  return { id: user.id, email: user.email, membershipId: membership.id };
}
async function login(person, slug) {
  const res = await request(server).post('/api/auth/login').send({
    email: person.email, passwordOrMagicCode: PASSWORD, ...(slug ? { tenantSlug: slug } : {}),
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.tokens.accessToken;
}
const get = (token, path) => {
  const req = request(server).get(path);
  return token ? req.set('Authorization', 'Bearer ' + token) : req;
};
const overview = (token) => get(token, '/api/dashboards/control-center');
const sessionIdOf = (token) => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sessionId;

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
  await app.listen(0, '127.0.0.1');
  server = app.getHttpServer();
  request = require('supertest');
  const { PrismaService } = require(join(apiRoot, 'dist/modules/prisma/prisma.service.js'));
  prisma = app.get(PrismaService);

  for (const k of ['a', 'b', 'c', 'd']) {
    co[k] = await prisma.tenant.create({ data: { name: `CC ${k} ${RUN}`, slug: `${RUN}-${k}`, status: 'ACTIVE' } });
  }
  // Owner of A and B, only a MANAGER in C; a second owner who owns D alone.
  people.owner = await member(co.a, 'OWNER', `owner-${RUN}@example.test`);
  people.ownerB = await member(co.b, 'OWNER', '', people.owner.id);
  people.ownerInC = await member(co.c, 'MANAGER', '', people.owner.id);
  people.solo = await member(co.d, 'OWNER', `solo-${RUN}@example.test`);
  people.manager = await member(co.a, 'MANAGER', `manager-${RUN}@example.test`);
  await member(co.b, 'MANAGER', '', people.manager.id);
  people.employee = await member(co.a, 'EMPLOYEE', `employee-${RUN}@example.test`);
  people.contractor = await member(co.a, 'CONTRACTOR', `contractor-${RUN}@example.test`);
  people.client = await member(co.a, 'CLIENT', `client-${RUN}@example.test`, undefined, { clientScopeKey: `${RUN}-k1` });

  const now = Date.now();
  const projectA = await prisma.project.create({ data: { tenantId: co.a.id, name: `A project ${RUN}`, status: 'ACTIVE' } });
  rec.overdueA = await prisma.task.create({
    data: { tenantId: co.a.id, projectId: projectA.id, title: `A overdue ${RUN}`, status: 'TODO', assignedToUserId: people.employee.id, dueAt: new Date(now - 2 * DAY) },
  });
  await prisma.task.create({ data: { tenantId: co.a.id, projectId: projectA.id, title: `A blocked ${RUN}`, status: 'BLOCKED' } });
  rec.approvalA = await prisma.approvalRequest.create({
    data: { tenantId: co.a.id, title: `A approval ${RUN}`, status: 'REQUESTED', requestedByUserId: people.manager.id },
  });
  await prisma.invoice.create({
    data: { tenantId: co.a.id, invoiceNumber: `A-${RUN}`, currency: 'EUR', totalCents: 10000, paidCents: 2500, status: 'PARTIALLY_PAID', dueAt: new Date(now - DAY) },
  });
  rec.taskB = await prisma.task.create({ data: { tenantId: co.b.id, title: `B blocked ${RUN}`, status: 'BLOCKED' } });
  rec.approvalB = await prisma.approvalRequest.create({ data: { tenantId: co.b.id, title: `B approval ${RUN}`, status: 'REQUESTED' } });
  await prisma.invoice.create({
    data: { tenantId: co.b.id, invoiceNumber: `B-${RUN}`, currency: 'USD', totalCents: 4200, status: 'SENT', dueAt: new Date(now + 10 * DAY) },
  });
  await prisma.task.create({ data: { tenantId: co.c.id, title: `C-ONLY ${RUN}`, status: 'BLOCKED' } });
  await prisma.invoice.create({
    data: { tenantId: co.c.id, invoiceNumber: `C-ONLY-${RUN}`, currency: 'EUR', totalCents: 777, status: 'OVERDUE', dueAt: new Date(now - DAY) },
  });

  people.ownerToken = await login(people.owner, co.a.slug);
  people.soloToken = await login(people.solo, co.d.slug);
});
after(async () => { if (app) await app.close(); });

describe('Control Center: who may open it', { skip }, () => {
  it('refuses anonymous requests', async () => {
    assert.equal((await overview(null)).status, 401);
  });

  it('refuses MANAGER, EMPLOYEE, CONTRACTOR and CLIENT', async () => {
    for (const p of ['manager', 'employee', 'contractor', 'client']) {
      const res = await overview(await login(people[p], co.a.slug));
      assert.equal(res.status, 403, p);
      assert.ok(!JSON.stringify(res.body).includes(RUN), `${p} response must not carry company data`);
    }
  });

  it('refuses a manager even with a custom dashboard grant', async () => {
    await prisma.membershipPermission.create({
      data: { membershipId: people.manager.membershipId, action: 'read', resource: 'dashboard', granted: true },
    });
    const res = await overview(await login(people.manager, co.a.slug));
    assert.equal(res.status, 403);
    await prisma.membershipPermission.deleteMany({ where: { membershipId: people.manager.membershipId } });
  });

  it('refuses an owner whose active session is in a company where they are only MANAGER', async () => {
    const inC = await login(people.owner, co.c.slug);
    assert.equal((await overview(inC)).status, 403);
  });
});

describe('Control Center: what an owner sees', { skip }, () => {
  it('lists exactly the companies the user owns, never the managed one', async () => {
    const res = await overview(people.ownerToken);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(new Set(res.body.companies.map((c) => c.id)), new Set([co.a.id, co.b.id]));
    const body = JSON.stringify(res.body);
    assert.ok(!body.includes(co.c.id) && !body.includes('C-ONLY'), 'company C data must not appear');
    assert.ok(!body.includes(co.d.id), 'another owner\'s company must not appear');
    assert.equal(res.body.companies.find((c) => c.id === co.a.id).isCurrent, true);
    assert.equal(res.body.companies.find((c) => c.id === co.b.id).isCurrent, false);
  });

  it('counts and links each record in its own company', async () => {
    const res = await overview(people.ownerToken);
    const a = res.body.companies.find((c) => c.id === co.a.id);
    assert.equal(a.counts.overdueTasks, 1);
    assert.equal(a.counts.blockedTasks, 1);
    assert.equal(a.counts.approvalsInternal, 1);
    const approvalB = res.body.attention.find((x) => x.id === rec.approvalB.id);
    assert.equal(approvalB.tenantId, co.b.id);
    assert.equal(approvalB.href, `/approvals?open=${rec.approvalB.id}`);
    const overdue = res.body.attention.find((x) => x.id === rec.overdueA.id);
    assert.equal(overdue.tenantId, co.a.id);
    assert.equal(overdue.kind, 'overdue');
  });

  it('keeps money per company and per currency, in cents', async () => {
    const res = await overview(people.ownerToken);
    const a = res.body.companies.find((c) => c.id === co.a.id).finance;
    const b = res.body.companies.find((c) => c.id === co.b.id).finance;
    assert.deepEqual(a.outstanding, [{ currency: 'EUR', openCents: 7500, invoices: 1 }]);
    assert.deepEqual(a.overdue, [{ currency: 'EUR', openCents: 7500, invoices: 1 }]);
    assert.deepEqual(b.outstanding, [{ currency: 'USD', openCents: 4200, invoices: 1 }]);
    assert.deepEqual(b.overdue, []);
  });

  it('works for an owner with a single company', async () => {
    const res = await overview(people.soloToken);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.companies.map((c) => [c.id, c.isCurrent]), [[co.d.id, true]]);
    assert.ok(!JSON.stringify(res.body).includes(co.a.id));
  });

  it('does not switch the active company or rotate the session', async () => {
    await overview(people.ownerToken);
    const me = await get(people.ownerToken, '/api/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.tenantId, co.a.id);
  });

  it('does not open another company\'s record by URL without switching', async () => {
    assert.equal((await get(people.ownerToken, `/api/tasks/${rec.taskB.id}`)).status, 404);
    assert.equal((await get(people.ownerToken, `/api/approvals/${rec.approvalB.id}`)).status, 404);
  });

  it('opens the other company\'s approval after the existing switch', async () => {
    const sw = await request(server).post('/api/auth/companies/switch')
      .set('Authorization', 'Bearer ' + await login(people.owner, co.a.slug)).send({ tenantId: co.b.id });
    assert.equal(sw.status, 200, JSON.stringify(sw.body));
    const tokenB = sw.body.tokens.accessToken;
    assert.equal((await get(tokenB, `/api/approvals/${rec.approvalB.id}`)).status, 200);
    const decided = await request(server).post(`/api/approvals/${rec.approvalB.id}/decision`)
      .set('Authorization', 'Bearer ' + tokenB).send({ decision: 'APPROVE' });
    assert.ok([200, 201].includes(decided.status), JSON.stringify(decided.body));
    const after = await overview(tokenB);
    assert.equal(after.status, 200);
    assert.ok(!after.body.attention.some((x) => x.id === rec.approvalB.id), 'decided approval leaves the queue');
    assert.equal(after.body.companies.find((c) => c.id === co.b.id).isCurrent, true);
  });
});

describe('Control Center: revocation and sessions', { skip }, () => {
  it('drops a company as soon as the owner membership is suspended', async () => {
    await prisma.tenantMembership.update({ where: { id: people.ownerB.membershipId }, data: { status: 'SUSPENDED' } });
    const res = await overview(people.ownerToken);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.companies.map((c) => c.id), [co.a.id]);
    assert.ok(!JSON.stringify(res.body).includes(co.b.id));
    await prisma.tenantMembership.update({ where: { id: people.ownerB.membershipId }, data: { status: 'ACTIVE' } });
  });

  it('refuses a session whose own membership was suspended', async () => {
    const token = await login(people.owner, co.b.slug);
    await prisma.tenantMembership.update({ where: { id: people.ownerB.membershipId }, data: { status: 'SUSPENDED' } });
    assert.equal((await overview(token)).status, 401);
    await prisma.tenantMembership.update({ where: { id: people.ownerB.membershipId }, data: { status: 'ACTIVE' } });
  });

  it('refuses an expired session', async () => {
    // Reuses the solo owner's session (last use) to stay under the login rate limit.
    await prisma.session.update({ where: { id: sessionIdOf(people.soloToken) }, data: { expiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await overview(people.soloToken)).status, 401);
  });
});
