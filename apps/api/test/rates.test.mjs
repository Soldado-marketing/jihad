/**
 * Rates, resolution and freezing (MAOS-T73, ADR-018) over HTTP against a real database.
 *
 *   - rates are OWNER-only (sensitive RATE + database OWNER check; a custom
 *     grant does not open them); one rate per workspace, target and day;
 *   - a new entry freezes the rate resolved member -> role -> tenant for its
 *     day, with cost = round_half_up(minutes x rate / 60); no source = unrated;
 *   - editing or deleting a rate never changes existing entries; a draft's
 *     minutes edit recomputes the cost from its frozen rate;
 *   - explicit OWNER re-rating re-resolves a date range (never BILLED) with
 *     one audit event per changed entry; tenants never see each other's rates.
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

const RUN = `rt${Date.now().toString(36)}`;
const PASSWORD = 'RatesPass123!';
const RATE_KEYS = ['rateCents', 'rateSource', 'currency', 'costCents'];

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
  del: (url) => request(server).delete(`/api${url}`).set('Authorization', `Bearer ${people[who].token}`),
});
const row = (id) => prisma.timeEntry.findUnique({ where: { id } });
const frozen = async (id) => {
  const r = await row(id);
  return [r.rateCents, r.rateSource, r.costCents];
};
const log = async (who, date, minutes) => {
  const res = await as(who).post('/time-entries', { date, minutes, projectId: d.P });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.id;
};

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
  people.owner = await member('a', 'owner', 'OWNER');
  people.manager = await member('a', 'manager', 'MANAGER');
  people.employee = await member('a', 'employee', 'EMPLOYEE');
  people.contractor = await member('a', 'contractor', 'CONTRACTOR');
  people.client = await member('a', 'client', 'CLIENT', `rk-${RUN}`);
  people.foreign = await member('b', 'foreign', 'OWNER');
  d.P = (await prisma.project.create({ data: { tenantId: t.a.id, name: `P ${RUN}` }, select: { id: true } })).id;
  d.Pb = (await prisma.project.create({ data: { tenantId: t.b.id, name: `Pb ${RUN}` }, select: { id: true } })).id;
  // T72 lets a contractor log time only on assigned work.
  await prisma.projectMember.create({ data: { tenantId: t.a.id, projectId: d.P, userId: people.contractor.id, role: 'CONTRACTOR' } });
});

after(async () => {
  if (app) await app.close();
});

describe('rates API (MAOS-T73)', { skip }, () => {
  it('only the OWNER reads or writes rates; a custom grant does not open them', async () => {
    for (const who of ['manager', 'employee', 'contractor', 'client']) {
      assert.equal((await as(who).get('/rates')).status, 403, who);
      assert.equal((await as(who).post('/rates', { scope: 'TENANT', rateCents: 1, validFrom: '2026-01-01' })).status, 403, who);
      assert.equal((await as(who).post('/rates/rerate', { from: '2026-01-01', to: '2026-01-02' })).status, 403, who);
    }
    await prisma.membershipPermission.create({ data: { membershipId: people.manager.membershipId, action: 'read', resource: 'rate' } });
    assert.equal((await as('manager').get('/rates')).status, 403, 'custom grant');
    assert.equal(await prisma.rate.count({ where: { tenantId: t.a.id } }), 0);
  });

  it('creates rates per scope with a derived key and refuses invalid ones', async () => {
    const make = (body) => as('owner').post('/rates', body);
    const tenant = await make({ scope: 'TENANT', rateCents: 3000, validFrom: '2026-01-01' });
    assert.equal(tenant.status, 201, JSON.stringify(tenant.body));
    assert.deepEqual([tenant.body.validFrom, tenant.body.currency], ['2026-01-01', 'EUR']);
    d.tenantRate = tenant.body.id;
    d.roleRate = (await make({ scope: 'ROLE', role: 'EMPLOYEE', rateCents: 4000, validFrom: '2026-01-01' })).body.id;
    d.memberRate = (await make({ scope: 'MEMBER', userId: people.employee.id, rateCents: 6000, validFrom: '2026-06-01' })).body.id;
    assert.equal((await prisma.rate.findUnique({ where: { id: d.memberRate } })).scopeKey, `MEMBER:${people.employee.id}`);

    const dup = await make({ scope: 'TENANT', rateCents: 1, validFrom: '2026-01-01' });
    assert.deepEqual([dup.status, dup.body.code], [409, 'RATE_EXISTS']);
    for (const bad of [
      { scope: 'TENANT', rateCents: 1, validFrom: '2026-02-01', scopeKey: 'TENANT' },
      { scope: 'TENANT', rateCents: 1, validFrom: '2026-02-01', userId: people.employee.id },
      { scope: 'ROLE', role: 'CLIENT', rateCents: 1, validFrom: '2026-02-01' },
      { scope: 'ROLE', rateCents: 1, validFrom: '2026-02-01' },
      { scope: 'MEMBER', userId: people.client.id, rateCents: 1, validFrom: '2026-02-01' },
      { scope: 'MEMBER', userId: people.foreign.id, rateCents: 1, validFrom: '2026-02-01' },
      { scope: 'TENANT', rateCents: -1, validFrom: '2026-02-01' },
      { scope: 'TENANT', rateCents: 12.5, validFrom: '2026-02-01' },
      { scope: 'TENANT', rateCents: 89_478_486, validFrom: '2026-02-01' },
      { scope: 'TENANT', rateCents: 1, validFrom: '2026-02-30' },
      { scope: 'TENANT', rateCents: 1, validFrom: '2026-02-01', currency: 'USD' },
    ]) assert.equal((await make(bad)).status, 400, JSON.stringify(bad));
    assert.equal((await as('owner').get('/rates')).body.length, 3);
  });
});

describe('resolution and freezing (MAOS-T73)', { skip }, () => {
  it('freezes member -> role -> tenant for the entry day, with the exact cost', async () => {
    d.empMarch = await log('employee', '2026-03-01', 60);
    assert.deepEqual(await frozen(d.empMarch), [4000, 'ROLE', 4000]);
    d.empJuly = await log('employee', '2026-07-01', 7);
    assert.deepEqual(await frozen(d.empJuly), [6000, 'MEMBER', 700]);
    d.mgrMarch = await log('manager', '2026-03-01', 30);
    assert.deepEqual(await frozen(d.mgrMarch), [3000, 'TENANT', 1500]);
    d.unrated = await log('contractor', '2025-12-31', 45);
    assert.deepEqual(await frozen(d.unrated), [null, null, null], 'before every rate: unrated, not 0');
    const r = await row(d.empMarch);
    assert.equal(r.currency, 'EUR');
  });

  it('a new tenant rate is effective from its first day only', async () => {
    assert.equal((await as('owner').post('/rates', { scope: 'TENANT', rateCents: 3500, validFrom: '2026-05-01' })).status, 201);
    assert.deepEqual(await frozen(await log('manager', '2026-04-30', 60)), [3000, 'TENANT', 3000]);
    assert.deepEqual(await frozen(await log('manager', '2026-05-01', 60)), [3500, 'TENANT', 3500]);
  });

  it('rate edits and deletions never change existing entries', async () => {
    assert.equal((await as('owner').patch(`/rates/${d.tenantRate}`, { rateCents: 9999 })).body.rateCents, 9999);
    assert.equal((await as('owner').del(`/rates/${d.roleRate}`)).status, 204);
    assert.deepEqual(await frozen(d.mgrMarch), [3000, 'TENANT', 1500]);
    assert.deepEqual(await frozen(d.empMarch), [4000, 'ROLE', 4000]);
    const ev = await prisma.auditEvent.findFirst({ where: { tenantId: t.a.id, resourceId: d.tenantRate, action: 'rate.updated' } });
    assert.deepEqual(ev.redactedPayload, { from: 3000, to: 9999 });
  });

  it('a draft minutes edit recomputes cost from the frozen rate, not the current one', async () => {
    const res = await as('employee').patch(`/time-entries/${d.empMarch}`, { minutes: 90 });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(await frozen(d.empMarch), [4000, 'ROLE', 6000]);
    assert.deepEqual(RATE_KEYS.filter((k) => k in res.body), [], 'the member never sees rate or cost');
    for (const who of ['manager', 'employee']) {
      const list = await as(who).get('/time-entries');
      assert.deepEqual(RATE_KEYS.filter((k) => JSON.stringify(list.body).includes(`"${k}"`)), [], who);
    }
    const owner = await as('owner').get(`/time-entries/${d.empMarch}`);
    assert.deepEqual([owner.body.rateCents, owner.body.costCents], [4000, 6000]);
  });
});

describe('re-rating (MAOS-T73)', { skip }, () => {
  it('re-resolves a range for one member, skips BILLED, audits each changed entry', async () => {
    const billed = await log('employee', '2026-03-02', 60);
    await prisma.timeEntry.update({ where: { id: billed }, data: { status: 'BILLED' } });
    const before = await frozen(billed);
    const res = await as('owner').post('/rates/rerate', { from: '2026-01-01', to: '2026-12-31', userId: people.employee.id });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    // March: role rate deleted -> tenant 9999 (90 min = 14999 cents); July: member rate unchanged.
    assert.deepEqual(await frozen(d.empMarch), [9999, 'TENANT', 14999]);
    assert.deepEqual(await frozen(d.empJuly), [6000, 'MEMBER', 700]);
    assert.deepEqual(await frozen(billed), before, 'BILLED untouched');
    assert.deepEqual(res.body, { checked: 2, changed: 1 });
    const ev = await prisma.auditEvent.findMany({ where: { tenantId: t.a.id, resourceId: d.empMarch, action: 'time_entry.rerated' } });
    assert.equal(ev.length, 1);
    assert.deepEqual(ev[0].redactedPayload.before, { rateCents: 4000, rateSource: 'ROLE', costCents: 6000 });
    assert.deepEqual(await frozen(d.mgrMarch), [3000, 'TENANT', 1500], 'other members not in the range');
  });

  it('rates an entry logged before any rate once a rate exists, and refuses bad ranges', async () => {
    assert.equal((await as('owner').post('/rates', { scope: 'TENANT', rateCents: 2000, validFrom: '2025-12-01' })).status, 201);
    const res = await as('owner').post('/rates/rerate', { from: '2025-12-31', to: '2025-12-31' });
    assert.deepEqual(res.body, { checked: 1, changed: 1 });
    assert.deepEqual(await frozen(d.unrated), [2000, 'TENANT', 1500]);
    assert.deepEqual((await as('owner').post('/rates/rerate', { from: '2025-12-31', to: '2025-12-31' })).body, { checked: 1, changed: 0 }, 'idempotent');
    assert.equal((await as('owner').post('/rates/rerate', { from: '2026-02-01', to: '2026-01-01' })).status, 400);
    assert.equal((await as('owner').post('/rates/rerate', { from: '2026-02-30', to: '2026-03-01' })).status, 400);
  });
});

describe('tenant isolation (MAOS-T73)', { skip }, () => {
  it('another tenant neither sees nor changes these rates, and its rates never apply here', async () => {
    assert.equal((await as('foreign').get('/rates')).body.length, 0);
    assert.equal((await as('foreign').patch(`/rates/${d.memberRate}`, { rateCents: 1 })).status, 404);
    assert.equal((await as('foreign').del(`/rates/${d.memberRate}`)).status, 404);
    assert.equal((await prisma.rate.findUnique({ where: { id: d.memberRate } })).rateCents, 6000);
    // The foreign default is NEWER than ours (2025-12-01) and still before the entry day, so only the tenant filter keeps it out.
    assert.equal((await as('foreign').post('/rates', { scope: 'TENANT', rateCents: 77777, validFrom: '2025-12-10' })).status, 201);
    assert.deepEqual(await frozen(await log('contractor', '2025-12-15', 60)), [2000, 'TENANT', 2000], 'own tenant default, not the foreign one');
    const foreignRerate = await as('foreign').post('/rates/rerate', { from: '2020-01-01', to: '2030-01-01' });
    assert.deepEqual(foreignRerate.body, { checked: 0, changed: 0 });
  });
});
