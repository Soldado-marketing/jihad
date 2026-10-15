/**
 * Project enrichment (MAOS-T56 schema, T57 API; Blueprint §11).
 * MIGRATION-GATED: runs only against a database migrated with this branch.
 *
 * serviceType, deadline, responsible user, project number (unique per
 * tenant, assigned when left out), customer (sets the client key with it,
 * ADR-017), budget (finance: OWNER only, never returned to other roles) and
 * progress derived from tasks.
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

const RUN = `pe${Date.now().toString(36)}`;
const PASSWORD = 'ProjectPass123!';

let app;
let server;
let request;
let prisma;
const t = {};
const u = {};

const as = (who) => ({
  get: (url) => request(server).get(`/api${url}`).set('Authorization', `Bearer ${u[who].token}`),
  post: (url, body) => request(server).post(`/api${url}`).set('Authorization', `Bearer ${u[who].token}`).send(body),
  patch: (url, body) => request(server).patch(`/api${url}`).set('Authorization', `Bearer ${u[who].token}`).send(body),
});

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

  const hash = await require('bcrypt').hash(PASSWORD, 10);
  for (const n of ['a', 'b']) t[n] = await prisma.tenant.create({ data: { name: `P${n} ${RUN}`, slug: `p${n}-${RUN}`, status: 'ACTIVE' } });
  async function member(tenant, label, role, status = 'ACTIVE', clientScopeKey = null) {
    const email = `${label}-${RUN}@example.test`;
    const user = await prisma.user.create({ data: { email, displayName: label, passwordHash: hash, status: 'APPROVED' } });
    await prisma.tenantMembership.create({
      data: { tenantId: t[tenant].id, userId: user.id, role, status, visibilityScope: 'TENANT_WIDE', clientScopeKey },
    });
    if (status !== 'ACTIVE') return { id: user.id };
    const res = await request(server).post('/api/auth/login').send({ email, passwordOrMagicCode: PASSWORD, tenantSlug: `p${tenant}-${RUN}` });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return { id: user.id, token: res.body.tokens.accessToken };
  }
  u.owner = await member('a', 'owner', 'OWNER');
  u.manager = await member('a', 'manager', 'MANAGER');
  u.employee = await member('a', 'employee', 'EMPLOYEE');
  u.contractor = await member('a', 'contractor', 'CONTRACTOR');
  u.client = await member('a', 'client', 'CLIENT', 'ACTIVE', `acme-${RUN}`);
  u.suspended = await member('a', 'suspended', 'EMPLOYEE', 'SUSPENDED');
  u.foreign = await member('b', 'foreign', 'OWNER');
});

after(async () => {
  if (app) await app.close();
});

describe('project enrichment (MAOS-T56/T57)', { skip }, () => {
  let acme;
  let p1;

  it('OWNER creates an enriched project; the number is assigned; the customer sets the client key too', async () => {
    acme = await prisma.customer.create({ data: { tenantId: t.a.id, clientScopeKey: `acme-${RUN}`, name: 'Acme' } });
    const res = await as('owner').post('/projects', {
      name: 'Website relaunch',
      serviceType: 'Web design',
      budgetCents: 1250000,
      deadline: '2026-12-01',
      ownerUserId: u.employee.id,
      customerId: acme.id,
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    p1 = res.body;
    assert.equal(p1.projectNumber, 'P-0001');
    assert.deepEqual([p1.serviceType, p1.budgetCents, p1.owner.id, p1.customer.name], ['Web design', 1250000, u.employee.id, 'Acme']);
    assert.equal(new Date(p1.deadline).toISOString().slice(0, 10), '2026-12-01');
    const row = await prisma.project.findUnique({ where: { id: p1.id } });
    assert.deepEqual([row.customerId, row.clientScopeKey], [acme.id, `acme-${RUN}`]);
    const second = await as('manager').post('/projects', { name: 'Second project' });
    assert.equal(second.body.projectNumber, 'P-0002');
  });

  it('project numbers are unique per tenant only', async () => {
    assert.equal((await as('owner').post('/projects', { name: 'Explicit', projectNumber: 'WEB-7' })).status, 201);
    const dup = await as('manager').post('/projects', { name: 'Dup', projectNumber: 'WEB-7' });
    assert.equal(dup.status, 409);
    assert.match(JSON.stringify(dup.body), /PROJECT_NUMBER_TAKEN/);
    assert.equal((await as('foreign').post('/projects', { name: 'Other tenant', projectNumber: 'WEB-7' })).status, 201);
    assert.equal((await as('owner').patch(`/projects/${p1.id}`, { projectNumber: 'WEB-7' })).status, 409);
    assert.equal((await as('owner').post('/projects', { name: 'Bad', projectNumber: 'has space' })).status, 400);
  });

  it('the budget is OWNER-only to set and to see', async () => {
    const create = await as('manager').post('/projects', { name: 'Budgeted', budgetCents: 100 });
    assert.equal(create.status, 403);
    assert.match(JSON.stringify(create.body), /PROJECT_BUDGET_OWNER_ONLY/);
    assert.equal((await as('manager').patch(`/projects/${p1.id}`, { budgetCents: null })).status, 403, 'not even clearing it');
    for (const who of ['manager', 'employee']) {
      const one = await as(who).get(`/projects/${p1.id}`);
      assert.equal(one.status, 200, who);
      assert.ok(!('budgetCents' in one.body), `${who} must not receive the budget`);
      const list = await as(who).get('/projects');
      assert.ok(list.body.every((p) => !('budgetCents' in p)), `${who} list must not carry budgets`);
    }
    const managerEdit = await as('manager').patch(`/projects/${p1.id}`, { serviceType: 'SEO' });
    assert.equal(managerEdit.status, 200);
    assert.ok(!('budgetCents' in managerEdit.body), 'not in a write response either');
    assert.equal((await as('owner').get(`/projects/${p1.id}`)).body.budgetCents, 1250000);
    assert.equal((await prisma.project.findUnique({ where: { id: p1.id } })).budgetCents, 1250000, 'manager edit kept it');
  });

  it('the responsible person must be an active team member of this tenant', async () => {
    for (const [id, why] of [[u.client.id, 'client'], [u.suspended.id, 'suspended'], [u.foreign.id, 'other tenant'], ['nope', 'unknown']]) {
      const res = await as('owner').patch(`/projects/${p1.id}`, { ownerUserId: id });
      assert.equal(res.status, 400, why);
      assert.match(JSON.stringify(res.body), /PROJECT_OWNER_INVALID/);
    }
    const ok = await as('manager').patch(`/projects/${p1.id}`, { ownerUserId: u.manager.id });
    assert.equal(ok.body.owner.id, u.manager.id);
    assert.equal((await as('manager').patch(`/projects/${p1.id}`, { ownerUserId: null })).body.owner, null);
  });

  it('the customer must be active and in this tenant; detaching clears the client key', async () => {
    const archived = await prisma.customer.create({ data: { tenantId: t.a.id, clientScopeKey: `old-${RUN}`, name: 'Old', status: 'ARCHIVED' } });
    const foreign = await prisma.customer.create({ data: { tenantId: t.b.id, clientScopeKey: `acme-${RUN}`, name: 'B Acme' } });
    for (const id of [archived.id, foreign.id, 'nope']) {
      const res = await as('owner').patch(`/projects/${p1.id}`, { customerId: id });
      assert.equal(res.status, 400, id);
      assert.match(JSON.stringify(res.body), /PROJECT_CUSTOMER_INVALID/);
    }
    assert.equal((await prisma.project.findUnique({ where: { id: p1.id } })).customerId, acme.id, 'unchanged');
    const detach = await as('owner').patch(`/projects/${p1.id}`, { customerId: null });
    assert.equal(detach.status, 200);
    const row = await prisma.project.findUnique({ where: { id: p1.id } });
    assert.deepEqual([row.customerId, row.clientScopeKey], [null, null]);
    await as('owner').patch(`/projects/${p1.id}`, { customerId: acme.id });
  });

  it('progress is derived from task status and ignores archived tasks', async () => {
    const mk = (status, assignee) => prisma.task.create({ data: { tenantId: t.a.id, projectId: p1.id, title: status, status, assignedToUserId: assignee } });
    await mk('DONE'); await mk('DONE'); await mk('TODO'); await mk('IN_PROGRESS', u.contractor.id); await mk('ARCHIVED');
    const one = await as('owner').get(`/projects/${p1.id}`);
    assert.deepEqual(one.body.progress, { done: 2, total: 4, percent: 50 });
    const list = await as('owner').get('/projects');
    assert.deepEqual(list.body.find((p) => p.id === p1.id).progress, { done: 2, total: 4, percent: 50 });
    const empty = list.body.find((p) => p.projectNumber === 'P-0002');
    assert.deepEqual(empty.progress, { done: 0, total: 0, percent: null });
    // A contractor sees the project through their assigned task, and progress over their tasks only, without the budget.
    const c = await as('contractor').get(`/projects/${p1.id}`);
    assert.equal(c.status, 200);
    assert.deepEqual(c.body.progress, { done: 0, total: 1, percent: 0 });
    assert.ok(!('budgetCents' in c.body));
  });

  it('other tenants cannot read or change it, and the client portal shows none of the new fields', async () => {
    assert.equal((await as('foreign').get(`/projects/${p1.id}`)).status, 404);
    assert.equal((await as('foreign').patch(`/projects/${p1.id}`, { serviceType: 'x' })).status, 404);
    await as('owner').patch(`/projects/${p1.id}`, { clientVisible: true });
    const portal = await request(server).get('/api/client/projects').set('Authorization', `Bearer ${u.client.token}`);
    assert.equal(portal.status, 200, JSON.stringify(portal.body));
    const mine = portal.body.find((p) => p.id === p1.id);
    assert.ok(mine, 'the client of acme sees the client-visible project of its customer');
    assert.deepEqual(Object.keys(mine).sort(), ['id', 'name', 'status']);
  });

  it('deleting answers 204 with no body, so no field (budget included) is returned', async () => {
    const tmp = await as('owner').post('/projects', { name: 'To delete', budgetCents: 500 });
    const del = await request(server).delete(`/api/projects/${tmp.body.id}`).set('Authorization', `Bearer ${u.manager.token}`);
    assert.equal(del.status, 204);
    assert.equal(del.text, '');
    assert.equal(await prisma.project.count({ where: { id: tmp.body.id } }), 0);
  });

  it('rejects malformed values', async () => {
    for (const body of [{ budgetCents: -1 }, { budgetCents: 1.5 }, { deadline: 'soon' }, { serviceType: 'x'.repeat(81) }]) {
      assert.equal((await as('owner').patch(`/projects/${p1.id}`, body)).status, 400, JSON.stringify(body));
    }
  });
});
