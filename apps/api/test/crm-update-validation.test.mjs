/**
 * CRM updates and report creation validate their bodies (MAOS-F3).
 *
 * PATCH /meetings/:id, /follow-ups/:id, /opportunities/:id and POST /reports
 * declared their bodies as inline types, so no DTO validation ran: an unknown
 * status reached Prisma and answered 500, and unknown fields passed through.
 * Now each route has a DTO: invalid values and unknown fields are 400, valid
 * updates still work. Drives the real app over HTTP.
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

const RUN = `cu${Date.now().toString(36)}`;
const PASSWORD = 'CrmUpdatePass123!';

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

const patch = (path, body) => as(request(server).patch(path)).send(body);

describe('CRM update validation', { skip }, () => {
  it('meeting: 400 for an unknown status or field, 200 for a valid update', async () => {
    const m = await prisma.meeting.create({ data: { tenantId: home.tenantId, title: `Meet ${RUN}` }, select: { id: true } });
    assert.equal((await patch(`/api/meetings/${m.id}`, { status: 'DONE' })).status, 400);
    assert.equal((await patch(`/api/meetings/${m.id}`, { tenantId: foreign.tenantId })).status, 400);
    assert.equal((await patch(`/api/meetings/${m.id}`, { scheduledAt: 'tomorrow' })).status, 400);
    const ok = await patch(`/api/meetings/${m.id}`, { status: 'COMPLETED', scheduledAt: null, notes: 'held' });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(ok.body.status, 'COMPLETED');
  });

  it('follow-up: 400 for the old DONE status, 200 for COMPLETED', async () => {
    const f = await prisma.followUp.create({ data: { tenantId: home.tenantId, title: `Call ${RUN}` }, select: { id: true } });
    assert.equal((await patch(`/api/follow-ups/${f.id}`, { status: 'DONE' })).status, 400);
    const ok = await patch(`/api/follow-ups/${f.id}`, { status: 'COMPLETED' });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(ok.body.status, 'COMPLETED');
  });

  it('opportunity: 400 for an unknown stage or negative value, 200 for a valid update', async () => {
    const o = await prisma.opportunity.create({ data: { tenantId: home.tenantId, title: `Deal ${RUN}` }, select: { id: true } });
    assert.equal((await patch(`/api/opportunities/${o.id}`, { status: 'CLOSED' })).status, 400);
    assert.equal((await patch(`/api/opportunities/${o.id}`, { valueCents: -1 })).status, 400);
    const ok = await patch(`/api/opportunities/${o.id}`, { status: 'WON', valueCents: 5000 });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(ok.body.status, 'WON');
  });

  it('report: 400 for a missing or too-short name, 201 for a valid one', async () => {
    assert.equal((await as(request(server).post('/api/reports')).send({})).status, 400);
    assert.equal((await as(request(server).post('/api/reports')).send({ name: 'x' })).status, 400);
    assert.equal((await as(request(server).post('/api/reports')).send({ name: `Report ${RUN}` })).status, 201);
  });
});
