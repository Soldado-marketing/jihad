/**
 * Labour cost in project profitability (MAOS-T74, ADR-018 §6) over HTTP.
 *
 *   - project cost = recorded costs + costs STORED on its time entries
 *     (billable and non-billable); never re-rated from current rates;
 *   - unrated minutes are reported separately and mark the result incomplete;
 *   - the summary and the per-project report agree;
 *   - OWNER only (sensitive finance), and per tenant.
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

const RUN = `fl${Date.now().toString(36)}`;
const PASSWORD = 'LabourPass123!';

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
const project = async (who, id) => (await as(who).get('/finance/profitability')).body.projects.find((p) => p.projectId === id);

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
  async function member(tenant, label, role) {
    const email = `${label}-${RUN}@example.test`;
    const user = await prisma.user.create({ data: { email, displayName: label, passwordHash: hash, status: 'APPROVED' }, select: { id: true } });
    await prisma.tenantMembership.create({ data: { tenantId: t[tenant].id, userId: user.id, role, status: 'ACTIVE', visibilityScope: 'TENANT_WIDE' } });
    const res = await request(server).post('/api/auth/login').send({ email, passwordOrMagicCode: PASSWORD, tenantSlug: `t${tenant}-${RUN}` });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return { id: user.id, token: res.body.tokens.accessToken };
  }
  people.owner = await member('a', 'owner', 'OWNER');
  people.manager = await member('a', 'manager', 'MANAGER');
  people.employee = await member('a', 'employee', 'EMPLOYEE');
  people.foreign = await member('b', 'foreign', 'OWNER');

  const A = t.a.id;
  d.P = (await prisma.project.create({ data: { tenantId: A, name: `P ${RUN}` }, select: { id: true } })).id;
  d.L = (await prisma.project.create({ data: { tenantId: A, name: `Labour only ${RUN}` }, select: { id: true } })).id;
  d.Pb = (await prisma.project.create({ data: { tenantId: t.b.id, name: `Pb ${RUN}` }, select: { id: true } })).id;
  await prisma.revenueRecord.create({ data: { tenantId: A, projectId: d.P, amountCents: 100000, currency: 'EUR', sourceType: 'MANUAL' } });
  await prisma.costRecord.create({ data: { tenantId: A, projectId: d.P, costType: 'SOFTWARE', amountCents: 20000, currency: 'EUR' } });
  await prisma.costRecord.create({ data: { tenantId: t.b.id, projectId: d.Pb, costType: 'SOFTWARE', amountCents: 555, currency: 'EUR' } });

  // Rates (OWNER) and entries (members) through the API: 6000 cents/h from 2026-01-01.
  const rate = await as('owner').post('/rates', { scope: 'TENANT', rateCents: 6000, validFrom: '2026-01-01' });
  assert.equal(rate.status, 201, JSON.stringify(rate.body));
  d.rate = rate.body.id;
  const log = async (who, body) => {
    const res = await as(who).post('/time-entries', { date: '2026-10-16', minutes: 60, ...body });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return res.body.id;
  };
  await log('employee', { projectId: d.P, minutes: 60 }); // 6000
  await log('employee', { projectId: d.P, minutes: 30, billable: false }); // 3000, non-billable still cost
  await log('manager', { projectId: d.P, minutes: 30, date: '2025-12-31' }); // before every rate: unrated
  await log('employee', { projectId: d.L, minutes: 10 }); // 1000, project with labour only
  // Foreign tenant labour must never appear in tenant a.
  await prisma.timeEntry.create({ data: { tenantId: t.b.id, userId: people.foreign.id, projectId: d.Pb, date: new Date('2026-10-16'), minutes: 60, rateCents: 60000, rateSource: 'TENANT', currency: 'EUR', costCents: 60000 } });
});

after(async () => {
  if (app) await app.close();
});

describe('labour in profitability (MAOS-T74)', { skip }, () => {
  it('adds stored labour to recorded costs per project and reports unrated minutes', async () => {
    const res = await as('owner').get('/finance/profitability');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const p = res.body.projects.find((x) => x.projectId === d.P);
    assert.deepEqual(
      [p.revenueCents, p.recordedCostCents, p.labourCostCents, p.costCents, p.marginCents, p.marginPercent, p.ratedMinutes, p.unratedMinutes, p.incomplete],
      [100000, 20000, 9000, 29000, 71000, 71, 90, 30, true],
    );
    const l = res.body.projects.find((x) => x.projectId === d.L);
    assert.deepEqual([l.projectName, l.labourCostCents, l.costCents, l.marginCents, l.incomplete], [`Labour only ${RUN}`, 1000, 1000, -1000, false]);
    assert.ok(!res.body.projects.some((x) => x.projectId === d.Pb), 'no foreign projects');
  });

  it('the summary agrees and flags unknown labour', async () => {
    const s = (await as('owner').get('/finance/summary')).body;
    assert.deepEqual(
      [s.recordedCostCents, s.labourCostCents, s.totalCostCents, s.ratedMinutes, s.unratedMinutes, s.incomplete],
      [20000, 10000, 30000, 100, 30, true],
    );
    assert.equal(s.marginCents, s.totalRevenueCents - 30000);
  });

  it('uses frozen costs: editing or adding rates does not change past labour', async () => {
    assert.equal((await as('owner').patch(`/rates/${d.rate}`, { rateCents: 99999 })).status, 200);
    assert.equal((await as('owner').post('/rates', { scope: 'TENANT', rateCents: 1, validFrom: '2025-01-01' })).status, 201);
    const p = await project('owner', d.P);
    assert.deepEqual([p.labourCostCents, p.unratedMinutes], [9000, 30], 'still the frozen 9000 and the same unrated minutes');
  });

  it('becomes complete once the OWNER re-rates the unrated entry', async () => {
    const r = await as('owner').post('/rates/rerate', { from: '2025-12-31', to: '2025-12-31' });
    assert.deepEqual(r.body, { checked: 1, changed: 1 });
    const p = await project('owner', d.P);
    // 30 minutes at the 2025-01-01 tenant rate of 1 cent/h = round_half_up(0.5) = 1 cent.
    assert.deepEqual([p.labourCostCents, p.unratedMinutes, p.incomplete], [9001, 0, false]);
  });

  it('is OWNER only and per tenant', async () => {
    for (const who of ['manager', 'employee']) {
      assert.equal((await as(who).get('/finance/profitability')).status, 403, who);
      assert.equal((await as(who).get('/finance/summary')).status, 403, who);
    }
    const foreign = await as('foreign').get('/finance/profitability');
    assert.deepEqual(foreign.body.projects.map((p) => [p.projectId, p.labourCostCents, p.recordedCostCents]), [[d.Pb, 60000, 555]]);
    const fs = (await as('foreign').get('/finance/summary')).body;
    assert.deepEqual([fs.labourCostCents, fs.incomplete], [60000, false]);
  });
});
