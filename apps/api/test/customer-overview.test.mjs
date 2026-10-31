/**
 * Customer 360 aggregation API (MAOS-T54): GET /api/customers/:id/overview.
 *
 * One read gathering a customer's projects, tasks, files, approvals and
 * invoices. Proven here over HTTP against a real database:
 *   - each section appears only when the caller may read that resource;
 *   - money (budgets, invoice amounts, totals, payments) only for the OWNER;
 *   - a contractor given customer access still sees only assigned work;
 *   - CLIENT and default CONTRACTOR are refused; a foreign tenant gets 404;
 *   - nothing of another customer of the same tenant leaks in.
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
const built = existsSync(join(apiRoot, 'dist/modules/customers/customer-overview.service.js'));
const configured = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET);
const skip = !enabled
  ? 'set MAOS_INTEGRATION=1 to run'
  : !built
    ? 'run `npm run build` first'
    : !configured
      ? 'DATABASE_URL and JWT_SECRET must be set'
      : false;

const RUN = `co${Date.now().toString(36)}`;
const PASSWORD = 'OverviewPass123!';
const MONEY_KEYS = ['budgetCents', 'totalCents', 'paidCents', 'amountCents', 'invoicedCents', 'outstandingCents', 'subtotalCents'];

let app;
let server;
let request;
let prisma;
const t = {};
const people = {};
const d = {};

const get = (who, url) => request(server).get(`/api${url}`).set('Authorization', `Bearer ${people[who].token}`);
const overview = (who, id = d.c1) => get(who, `/customers/${id}/overview`);
const hasMoney = (body) => MONEY_KEYS.filter((k) => JSON.stringify(body).includes(`"${k}"`));

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

  const hash = await require('bcrypt').hash(PASSWORD, 10);
  for (const name of ['a', 'b']) {
    t[name] = await prisma.tenant.create({ data: { name: `T${name} ${RUN}`, slug: `t${name}-${RUN}`, status: 'ACTIVE' }, select: { id: true } });
  }
  async function member(tenant, label, role, clientScopeKey) {
    const email = `${label}-${RUN}@example.test`;
    const user = await prisma.user.create({ data: { email, displayName: label, passwordHash: hash, status: 'APPROVED' }, select: { id: true } });
    const m = await prisma.tenantMembership.create({
      data: { tenantId: t[tenant].id, userId: user.id, role, status: 'ACTIVE', visibilityScope: 'TENANT_WIDE', clientScopeKey },
      select: { id: true },
    });
    const res = await request(server).post('/api/auth/login').send({ email, passwordOrMagicCode: PASSWORD, tenantSlug: `t${tenant}-${RUN}` });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return { id: user.id, membershipId: m.id, token: res.body.tokens.accessToken };
  }
  const k1 = `ov-one-${RUN}`;
  const k2 = `ov-two-${RUN}`;
  people.owner = await member('a', 'owner', 'OWNER');
  people.manager = await member('a', 'manager', 'MANAGER');
  people.employee = await member('a', 'employee', 'EMPLOYEE');
  people.contractor = await member('a', 'contractor', 'CONTRACTOR');
  people.scoped = await member('a', 'scoped', 'CONTRACTOR');
  people.client = await member('a', 'client', 'CLIENT', k1);
  people.foreign = await member('b', 'foreign', 'OWNER');

  // The scoped contractor is granted customer read explicitly (custom grant).
  await prisma.membershipPermission.create({ data: { membershipId: people.scoped.membershipId, action: 'read', resource: 'customer' } });

  const A = t.a.id;
  d.c1 = (await prisma.customer.create({ data: { tenantId: A, clientScopeKey: k1, name: 'One' }, select: { id: true } })).id;
  d.c2 = (await prisma.customer.create({ data: { tenantId: A, clientScopeKey: k2, name: 'Two' }, select: { id: true } })).id;
  d.cb = (await prisma.customer.create({ data: { tenantId: t.b.id, clientScopeKey: k1, name: 'Foreign' }, select: { id: true } })).id;

  const project = (name, customerId, key, extra = {}) =>
    prisma.project.create({ data: { tenantId: A, name, customerId, clientScopeKey: key, ...extra }, select: { id: true } }).then((r) => r.id);
  d.p1 = await project(`P1 ${RUN}`, d.c1, k1, { budgetCents: 500000, projectNumber: `P-${RUN}`, serviceType: 'SEO' });
  d.p3 = await project(`P3 ${RUN}`, d.c1, k1);
  d.p2 = await project(`P2 ${RUN}`, d.c2, k2);

  const task = (projectId, status, extra = {}) =>
    prisma.task.create({ data: { tenantId: A, projectId, title: `t-${status}-${RUN}`, status, ...extra }, select: { id: true } }).then((r) => r.id);
  d.tDone = await task(d.p1, 'DONE');
  d.tTodo = await task(d.p1, 'TODO', { dueAt: new Date(Date.now() + 86400000), assignedToUserId: people.scoped.id });
  d.tArchived = await task(d.p1, 'ARCHIVED');
  d.tP3 = await task(d.p3, 'IN_PROGRESS');
  d.tOther = await task(d.p2, 'TODO', { dueAt: new Date(Date.now() + 3600000) });

  d.f1 = (await prisma.fileAsset.create({ data: { tenantId: A, projectId: d.p1, name: `f1-${RUN}`, customerId: d.c1, clientScopeKey: k1 }, select: { id: true } })).id;
  d.f2 = (await prisma.fileAsset.create({ data: { tenantId: A, projectId: d.p2, name: `f2-${RUN}`, customerId: d.c2, clientScopeKey: k2 }, select: { id: true } })).id;
  d.a1 = (await prisma.approvalRequest.create({ data: { tenantId: A, fileAssetId: d.f1, title: `a1-${RUN}`, status: 'REQUESTED', clientScopeKey: k1 }, select: { id: true } })).id;
  d.a2 = (await prisma.approvalRequest.create({ data: { tenantId: A, fileAssetId: d.f2, title: `a2-${RUN}`, status: 'REQUESTED', clientScopeKey: k2 }, select: { id: true } })).id;

  const invoice = (n, customerId, key, status, totalCents, paidCents) =>
    prisma.invoice
      .create({ data: { tenantId: A, invoiceNumber: `${n}-${RUN}`, currency: 'EUR', customerId, clientScopeKey: key, status, subtotalCents: totalCents, totalCents, paidCents }, select: { id: true } })
      .then((r) => r.id);
  d.i1 = await invoice('I1', d.c1, k1, 'PARTIALLY_PAID', 10000, 2500);
  d.iDraft = await invoice('ID', d.c1, k1, 'DRAFT', 999, 0);
  d.i2 = await invoice('I2', d.c2, k2, 'SENT', 7777, 0);
  d.pay1 = (await prisma.payment.create({ data: { tenantId: A, invoiceId: d.i1, amountCents: 2500, currency: 'EUR', clientScopeKey: k1 }, select: { id: true } })).id;
  d.pay2 = (await prisma.payment.create({ data: { tenantId: A, invoiceId: d.i2, amountCents: 1, currency: 'EUR', clientScopeKey: k2 }, select: { id: true } })).id;
});

after(async () => {
  if (app) await app.close();
});

describe('customer overview (MAOS-T54)', { skip }, () => {
  it('OWNER: every section, derived progress, finance totals in cents per currency', async () => {
    const res = await overview('owner');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const b = res.body;
    assert.equal(b.customer.id, d.c1);
    assert.deepEqual(b.sections, ['projects', 'tasks', 'files', 'approvals', 'invoices', 'finance']);

    assert.equal(b.projects.total, 2);
    const p1 = b.projects.items.find((p) => p.id === d.p1);
    assert.equal(p1.budgetCents, 500000);
    assert.equal(p1.projectNumber, `P-${RUN}`);
    assert.deepEqual(p1.progress, { done: 1, total: 2, percent: 50 }, 'archived tasks do not count');

    assert.deepEqual(b.tasks.byStatus, { DONE: 1, TODO: 1, ARCHIVED: 1, IN_PROGRESS: 1 });
    assert.deepEqual(b.tasks.upcoming.map((x) => x.id), [d.tTodo]);
    assert.equal(b.files.total, 1);
    assert.deepEqual(b.files.recent.map((f) => f.id), [d.f1]);
    assert.ok(!JSON.stringify(b.files).includes('storageKey'));
    assert.deepEqual(b.approvals.byStatus, { REQUESTED: 1 });
    assert.deepEqual(b.approvals.open.map((a) => a.id), [d.a1]);
    assert.deepEqual(b.invoices.byStatus, { PARTIALLY_PAID: 1, DRAFT: 1 });
    assert.ok(!JSON.stringify(b.invoices).includes('Cents'), 'the invoice list carries no amounts');

    // Draft invoice excluded from money owed.
    assert.deepEqual(b.finance.totals, [{ currency: 'EUR', invoicedCents: 10000, paidCents: 2500, outstandingCents: 7500 }]);
    assert.deepEqual(b.finance.recentPayments.map((p) => p.id), [d.pay1]);
  });

  it('nothing of another customer of the same tenant leaks in', async () => {
    const body = JSON.stringify((await overview('owner')).body);
    for (const id of [d.c2, d.p2, d.tOther, d.f2, d.a2, d.i2, d.pay2, d.cb]) assert.ok(!body.includes(id), `leaked ${id}`);
  });

  it('MANAGER without the invoices grant: no invoices section', async () => {
    const res = await overview('manager');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(res.body.sections, ['projects', 'tasks', 'files', 'approvals']);
    assert.equal(res.body.invoices, undefined);
  });

  it('MANAGER with the invoices grant: invoices without amounts, no finance section, no budget', async () => {
    const grant = await request(server).patch(`/api/auth/company-members/${people.manager.id}/grants/invoices`)
      .set('Authorization', `Bearer ${people.owner.token}`).send({ enabled: true });
    assert.equal(grant.status, 200, JSON.stringify(grant.body));
    const res = await overview('manager');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(res.body.sections, ['projects', 'tasks', 'files', 'approvals', 'invoices']);
    assert.equal(res.body.finance, undefined);
    assert.deepEqual(hasMoney(res.body), []);
    assert.equal(res.body.invoices.recent.length, 2);
  });

  it('EMPLOYEE: no invoices and no money', async () => {
    const res = await overview('employee');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(res.body.sections, ['projects', 'tasks', 'files', 'approvals']);
    assert.equal(res.body.invoices, undefined);
    assert.deepEqual(hasMoney(res.body), []);
  });

  it('a section the caller is denied by a custom permission disappears', async () => {
    const m = await prisma.membershipPermission.create({ data: { membershipId: people.employee.membershipId, action: 'read', resource: 'project', granted: false } });
    try {
      const res = await overview('employee');
      assert.equal(res.status, 200);
      assert.ok(!res.body.sections.includes('projects'));
      assert.equal(res.body.projects, undefined);
    } finally {
      await prisma.membershipPermission.delete({ where: { id: m.id } });
    }
  });

  it('a contractor granted customer read still sees only assigned work', async () => {
    const res = await overview('scoped');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(res.body.sections, ['projects', 'tasks', 'files']);
    // Assigned one task in P1: P1's own record, that task only, no P3, no files of P1.
    assert.deepEqual(res.body.projects.items.map((p) => p.id), [d.p1]);
    assert.deepEqual(res.body.projects.items[0].progress, { done: 0, total: 1, percent: 0 });
    assert.deepEqual(res.body.tasks.byStatus, { TODO: 1 });
    assert.equal(res.body.files.total, 0);
    assert.deepEqual(hasMoney(res.body), []);
  });

  it('CLIENT and a default CONTRACTOR are refused', async () => {
    assert.equal((await overview('client')).status, 403);
    assert.equal((await overview('contractor')).status, 403);
  });

  it('a foreign tenant id and an unknown id answer 404 without data', async () => {
    const foreign = await overview('foreign', d.c1);
    assert.equal(foreign.status, 404);
    assert.ok(!JSON.stringify(foreign.body).includes('One'));
    assert.equal((await overview('owner', d.cb)).status, 404);
    assert.equal((await overview('owner', 'does-not-exist')).status, 404);
  });
});
