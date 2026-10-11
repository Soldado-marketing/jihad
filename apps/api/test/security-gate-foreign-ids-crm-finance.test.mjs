/**
 * Security gate - foreign IDs in CRM and finance are tenant-validated (MAOS-T29).
 *
 * Continues MAOS-T27/T28. Before this gate a member of tenant A could hang an
 * opportunity, meeting or follow-up on tenant B's lead or opportunity, or
 * issue an invoice against tenant B's project. These tests drive the real app
 * over HTTP and prove every such reference must belong to the caller's tenant,
 * nothing is written when it does not, and the refusal reveals nothing.
 * Payments already refuse a foreign invoice (MAOS-T34); that is pinned here
 * too so the whole finance write surface is covered in one place.
 *
 * Prerequisites (otherwise the whole suite skips rather than failing):
 *   npm run build; migrated PostgreSQL; DATABASE_URL + JWT_SECRET; MAOS_INTEGRATION=1.
 * Seeds its own two tenants directly, so it shares a database with the other suites.
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

const RUN = `fm${Date.now().toString(36)}`;
const PASSWORD = 'ForeignCrmPass123!';

let app;
let server;
let request;
let prisma;
let token = '';
const home = {};
const foreign = {};

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

const as = (req) => req.set('Authorization', `Bearer ${token}`);
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
  server = app.getHttpServer();
  request = require('supertest');
  const { PrismaService } = require(join(apiRoot, 'dist/modules/prisma/prisma.service.js'));
  prisma = app.get(PrismaService);

  const t1 = await seedTenant('home');
  home.tenantId = t1.id;
  const owner = await seedUser(t1.id, 'owner', 'OWNER');
  home.project = await prisma.project.create({ data: { tenantId: t1.id, name: `Home project ${RUN}` }, select: { id: true } });
  home.lead = await prisma.lead.create({ data: { tenantId: t1.id, name: `Home lead ${RUN}` }, select: { id: true } });
  home.opportunity = await prisma.opportunity.create({ data: { tenantId: t1.id, title: `Home deal ${RUN}` }, select: { id: true } });

  const t2 = await seedTenant('foreign');
  foreign.tenantId = t2.id;
  foreign.user = await seedUser(t2.id, 'stranger', 'EMPLOYEE');
  foreign.project = await prisma.project.create({ data: { tenantId: t2.id, name: `Foreign project ${RUN}` }, select: { id: true } });
  foreign.lead = await prisma.lead.create({ data: { tenantId: t2.id, name: `Foreign lead ${RUN}` }, select: { id: true } });
  foreign.opportunity = await prisma.opportunity.create({ data: { tenantId: t2.id, title: `Foreign deal ${RUN}` }, select: { id: true } });
  foreign.invoice = await prisma.invoice.create({
    data: { tenantId: t2.id, invoiceNumber: `F-${RUN}`, currency: 'EUR', status: 'SENT', totalCents: 1000 },
    select: { id: true },
  });

  const res = await request(server).post('/api/auth/login').send({ email: owner.email, passwordOrMagicCode: PASSWORD, tenantSlug: t1.slug });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  token = res.body.tokens.accessToken;
});

after(async () => {
  if (app) await app.close();
});

function assertInvalidReference(res, field, ...hidden) {
  assert.equal(res.status, 400, JSON.stringify(res.body));
  const body = JSON.stringify(res.body);
  assert.match(body, /INVALID_REFERENCE/);
  assert.match(body, new RegExp(`"field":"${field}"`));
  for (const v of hidden) assert.ok(!body.includes(v), `refusal leaked ${v}`);
  assert.ok(!/Foreign|stranger/.test(body), 'refusal leaked foreign data');
}

const count = (model) => prisma[model].count({ where: { tenantId: home.tenantId } });
const post = (path, body) => as(request(server).post(path)).send(body);

describe('Gate - CRM references', { skip }, () => {
  it('opportunity: refuses a foreign lead and writes nothing', async () => {
    const before = await count('opportunity');
    assertInvalidReference(await post('/api/opportunities', { title: `Deal ${RUN}`, leadId: foreign.lead.id }), 'leadId', foreign.lead.id);
    assert.equal(await count('opportunity'), before);
  });

  it('meeting: refuses a foreign lead and a foreign opportunity', async () => {
    const before = await count('meeting');
    assertInvalidReference(await post('/api/meetings', { title: `Meet ${RUN}`, leadId: foreign.lead.id }), 'leadId');
    assertInvalidReference(await post('/api/meetings', { title: `Meet ${RUN}`, opportunityId: foreign.opportunity.id }), 'opportunityId');
    assert.equal(await count('meeting'), before);
  });

  it('follow-up: refuses a foreign lead and a foreign opportunity', async () => {
    const before = await count('followUp');
    assertInvalidReference(await post('/api/follow-ups', { title: `Call ${RUN}`, leadId: foreign.lead.id }), 'leadId');
    assertInvalidReference(await post('/api/follow-ups', { title: `Call ${RUN}`, opportunityId: foreign.opportunity.id }), 'opportunityId');
    assert.equal(await count('followUp'), before);
  });

  it('answers a foreign ID and a non-existent ID the same way', async () => {
    const a = await post('/api/opportunities', { title: `Deal ${RUN}`, leadId: foreign.lead.id });
    const b = await post('/api/opportunities', { title: `Deal ${RUN}`, leadId: NON_EXISTENT });
    const { requestId: _a, ...bodyA } = a.body;
    const { requestId: _b, ...bodyB } = b.body;
    assert.deepEqual(bodyA, bodyB);
  });

  it('accepts same-tenant references (control)', async () => {
    assert.equal((await post('/api/opportunities', { title: `Deal ${RUN}`, leadId: home.lead.id })).status, 201);
    assert.equal(
      (await post('/api/meetings', { title: `Meet ${RUN}`, leadId: home.lead.id, opportunityId: home.opportunity.id })).status,
      201,
    );
    assert.equal(
      (await post('/api/follow-ups', { title: `Call ${RUN}`, leadId: home.lead.id, opportunityId: home.opportunity.id })).status,
      201,
    );
  });
});

describe('Gate - finance references', { skip }, () => {
  it("invoice: refuses another tenant's project and writes nothing", async () => {
    const before = await count('invoice');
    const res = await post('/api/invoices', { invoiceNumber: `INV-${RUN}-x`, currency: 'EUR', projectId: foreign.project.id });
    assertInvalidReference(res, 'projectId', foreign.project.id);
    assert.equal(await count('invoice'), before);
  });

  it('invoice: accepts a same-tenant project (control)', async () => {
    const res = await post('/api/invoices', { invoiceNumber: `INV-${RUN}-ok`, currency: 'EUR', projectId: home.project.id });
    assert.equal(res.status, 201, JSON.stringify(res.body));
  });

  it("payment: refuses another tenant's invoice (404) and writes nothing", async () => {
    const before = await count('payment');
    const res = await post('/api/payments', { invoiceId: foreign.invoice.id, amountCents: 500, currency: 'EUR' });
    assert.equal(res.status, 404, JSON.stringify(res.body));
    assert.ok(!JSON.stringify(res.body).includes(foreign.invoice.id));
    assert.equal(await count('payment'), before);
    const foreignInvoice = await prisma.invoice.findUnique({ where: { id: foreign.invoice.id }, select: { paidCents: true } });
    assert.equal(foreignInvoice.paidCents, 0);
  });
});
