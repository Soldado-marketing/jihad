/**
 * Customer profitability (MAOS-T75) over HTTP: GET /api/finance/profitability/customers.
 *
 *   - per customer: revenue (by the record's client key, else its project's
 *     customer), recorded costs and STORED labour of the customer's projects;
 *   - unrated minutes apart and flagged; unattributed amounts in one row;
 *     customer rows + that row = the workspace summary;
 *   - frozen costs (rate edits change nothing); OWNER only; per tenant.
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
const built = existsSync(join(apiRoot, 'dist/modules/rates/rates.module.js'));
const configured = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET);
const skip = !enabled
  ? 'set MAOS_INTEGRATION=1 to run'
  : !built
    ? 'run `npm run build` first'
    : !configured
      ? 'DATABASE_URL and JWT_SECRET must be set'
      : false;

const RUN = `cp${Date.now().toString(36)}`;
const PASSWORD = 'CustProfitPass123!';

let app;
let server;
let request;
let prisma;
const t = {};
const people = {};
const d = {};

const as = (who) => ({
  get: (url) => request(server).get(`/api${url}`).set('Authorization', `Bearer ${people[who].token}`),
  post: (url, body) => request(server).post(`/api${url}`).set('Authorization', `Bearer ${people[who].token}`).send(body),
  patch: (url, body) => request(server).patch(`/api${url}`).set('Authorization', `Bearer ${people[who].token}`).send(body),
});
const rows = async (who = 'owner') => (await as(who).get('/finance/profitability/customers')).body.customers;
const row = async (id) => (await rows()).find((r) => r.customerId === id);

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
    await prisma.tenantMembership.create({ data: { tenantId: t[tenant].id, userId: user.id, role, status: 'ACTIVE', visibilityScope: 'TENANT_WIDE', clientScopeKey } });
    const res = await request(server).post('/api/auth/login').send({ email, passwordOrMagicCode: PASSWORD, tenantSlug: `t${tenant}-${RUN}` });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return { id: user.id, token: res.body.tokens.accessToken };
  }
  const A = t.a.id;
  // Customers first, then anything carrying their keys.
  d.acme = (await prisma.customer.create({ data: { tenantId: A, clientScopeKey: `acme-${RUN}`, name: `Acme ${RUN}` }, select: { id: true } })).id;
  d.beta = (await prisma.customer.create({ data: { tenantId: A, clientScopeKey: `beta-${RUN}`, name: `Beta ${RUN}` }, select: { id: true } })).id;
  d.foreignAcme = (await prisma.customer.create({ data: { tenantId: t.b.id, clientScopeKey: `acme-${RUN}`, name: 'Foreign Acme' }, select: { id: true } })).id;
  people.owner = await member('a', 'owner', 'OWNER');
  people.manager = await member('a', 'manager', 'MANAGER');
  people.employee = await member('a', 'employee', 'EMPLOYEE');
  people.client = await member('a', 'client', 'CLIENT', `acme-${RUN}`);
  people.foreign = await member('b', 'foreign', 'OWNER');

  const project = (tenantId, name, customerId, key) => prisma.project.create({ data: { tenantId, name: `${name} ${RUN}`, customerId, clientScopeKey: key }, select: { id: true } }).then((r) => r.id);
  d.P1 = await project(A, 'Acme site', d.acme, `acme-${RUN}`);
  d.P2 = await project(A, 'Acme ads', d.acme, `acme-${RUN}`);
  d.P3 = await project(A, 'Beta book', d.beta, `beta-${RUN}`);
  d.P0 = await project(A, 'Internal', null, null);
  d.Pb = await project(t.b.id, 'Foreign', d.foreignAcme, `acme-${RUN}`);

  const revenue = (tenantId, projectId, amountCents, clientScopeKey) =>
    prisma.revenueRecord.create({ data: { tenantId, projectId, amountCents, currency: 'EUR', sourceType: 'MANUAL', clientScopeKey } });
  await revenue(A, d.P1, 100000, `acme-${RUN}`);
  await revenue(A, null, 5000, `beta-${RUN}`); // no project: attributed by the record's key
  await revenue(A, null, 700, null); // no project, no key: unattributed
  await revenue(t.b.id, d.Pb, 99999, `acme-${RUN}`);
  const cost = (tenantId, projectId, amountCents) => prisma.costRecord.create({ data: { tenantId, projectId, costType: 'SOFTWARE', amountCents, currency: 'EUR' } });
  await cost(A, d.P2, 20000);
  await cost(A, d.P0, 300); // internal project: unattributed
  await cost(A, null, 100);

  const rate = await as('owner').post('/rates', { scope: 'TENANT', rateCents: 6000, validFrom: '2026-01-01' });
  d.rate = rate.body.id;
  const log = async (projectId, minutes, date = '2026-10-16', billable = true) => {
    const res = await as('employee').post('/time-entries', { date, minutes, projectId, billable });
    assert.equal(res.status, 201, JSON.stringify(res.body));
  };
  await log(d.P1, 60); // 6000
  await log(d.P2, 30, '2026-10-16', false); // 3000, non-billable counts
  await log(d.P1, 45, '2025-12-31'); // unrated
  await log(d.P3, 10); // 1000
  await log(d.P0, 20); // 2000, internal: unattributed
});

after(async () => {
  if (app) await app.close();
});

describe('customer profitability (MAOS-T75)', { skip }, () => {
  it('sums each customer across its projects with stored labour; unrated minutes apart', async () => {
    const acme = await row(d.acme);
    assert.deepEqual(
      [acme.customerName, acme.revenueCents, acme.recordedCostCents, acme.labourCostCents, acme.costCents, acme.marginCents, acme.marginPercent, acme.ratedMinutes, acme.unratedMinutes, acme.incomplete],
      [`Acme ${RUN}`, 100000, 20000, 9000, 29000, 71000, 71, 90, 45, true],
    );
    const beta = await row(d.beta);
    assert.deepEqual([beta.revenueCents, beta.labourCostCents, beta.costCents, beta.marginCents, beta.incomplete], [5000, 1000, 1000, 4000, false], 'revenue without a project attributed by its client key');
  });

  it('keeps unattributed amounts in one row and reconciles with the summary', async () => {
    const all = await rows();
    const none = all.find((r) => r.customerId === null);
    assert.deepEqual([none.customerName, none.revenueCents, none.recordedCostCents, none.labourCostCents], [null, 700, 400, 2000]);
    assert.equal(all.at(-1).customerId, null, 'unattributed row last');
    const summary = (await as('owner').get('/finance/summary')).body;
    const sum = (k) => all.reduce((n, r) => n + r[k], 0);
    assert.deepEqual([sum('revenueCents'), sum('costCents'), sum('labourCostCents'), sum('unratedMinutes')], [summary.totalRevenueCents, summary.totalCostCents, summary.labourCostCents, summary.unratedMinutes]);
  });

  it('uses frozen labour: a rate edit changes nothing', async () => {
    assert.equal((await as('owner').patch(`/rates/${d.rate}`, { rateCents: 99999 })).status, 200);
    assert.equal((await row(d.acme)).labourCostCents, 9000);
  });

  it('is OWNER only and never shows another tenant', async () => {
    for (const who of ['manager', 'employee', 'client']) assert.equal((await as(who).get('/finance/profitability/customers')).status, 403, who);
    const all = await rows();
    assert.ok(!all.some((r) => r.customerId === d.foreignAcme));
    assert.ok(!all.some((r) => r.revenueCents === 99999 || r.revenueCents === 99999 + 100000), 'foreign revenue with the same key never counted');
    const foreign = (await as('foreign').get('/finance/profitability/customers')).body.customers;
    assert.deepEqual(foreign.map((r) => [r.customerId, r.revenueCents]), [[d.foreignAcme, 99999]]);
    assert.equal((await request(server).get('/api/finance/profitability/customers')).status, 401);
  });
});
