/**
 * Visibility scope is only ever what the backend enforces (MAOS-T36).
 *
 * TenantMembership.visibilityScope offered five values, but no query filters on
 * it: internal roles see by role, tenant-wide, and a CLIENT is isolated by its
 * clientScopeKey. The owner's approval screen nevertheless let the owner pick
 * "Assigned items only" (its default), implying a restriction that did not
 * exist. These tests drive the real approval endpoint and prove the stored
 * scope is derived from the role - CLIENT_LEVEL for a CLIENT, TENANT_WIDE for
 * every internal role - whatever the request asks for.
 *
 * Prerequisites (otherwise the whole suite skips rather than failing):
 *   npm run build; migrated PostgreSQL; DATABASE_URL + JWT_SECRET; MAOS_INTEGRATION=1.
 * Seeds its own tenant directly, so it shares a database with the other suites.
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

const RUN = `vs${Date.now().toString(36)}`;
const PASSWORD = 'VisibilityPass123!';

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
    data: { email: `applicant${n}-${RUN}@example.test`, displayName: `applicant ${n}`, status: 'PENDING_APPROVAL' },
    select: { id: true },
  });
  const req = await prisma.registrationRequest.create({
    data: { userId: user.id, tenantId, fullName: `Applicant ${n}`, requestedRole },
    select: { id: true },
  });
  return { userId: user.id, requestId: req.id };
}

const approve = (requestId, body) =>
  request(server).post(`/api/admin/users/requests/${requestId}/approve`).set('Authorization', `Bearer ${token}`).send(body);

const storedScope = async (userId) =>
  (await prisma.tenantMembership.findUnique({ where: { tenantId_userId: { tenantId, userId } }, select: { visibilityScope: true } }))
    ?.visibilityScope;

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

  const bcrypt = require('bcrypt');
  const tenant = await prisma.tenant.create({ data: { name: `Tenant ${RUN}`, slug: `tenant-${RUN}`, status: 'ACTIVE' }, select: { id: true } });
  tenantId = tenant.id;
  const owner = await prisma.user.create({
    data: { email: `owner-${RUN}@example.test`, displayName: 'owner', passwordHash: await bcrypt.hash(PASSWORD, 10), status: 'APPROVED' },
    select: { id: true },
  });
  await prisma.tenantMembership.create({ data: { tenantId, userId: owner.id, role: 'OWNER', status: 'ACTIVE', visibilityScope: 'TENANT_WIDE' } });
  const res = await request(server).post('/api/auth/login').send({ email: `owner-${RUN}@example.test`, passwordOrMagicCode: PASSWORD, tenantSlug: `tenant-${RUN}` });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  token = res.body.tokens.accessToken;
});

after(async () => {
  if (app) await app.close();
});

describe('approval stores only an enforced visibility scope', { skip }, () => {
  for (const role of ['MANAGER', 'EMPLOYEE', 'CONTRACTOR']) {
    it(`stores TENANT_WIDE for ${role} even when ASSIGNED_ITEMS_ONLY is requested`, async () => {
      const r = await pendingRequest(role);
      const res = await approve(r.requestId, { role, visibilityScope: 'ASSIGNED_ITEMS_ONLY' });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(await storedScope(r.userId), 'TENANT_WIDE');
    });
  }

  it('stores CLIENT_LEVEL for a CLIENT (isolation is enforced by its client scope)', async () => {
    const r = await pendingRequest('CLIENT');
    const res = await approve(r.requestId, { role: 'CLIENT', visibilityScope: 'TENANT_WIDE' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(await storedScope(r.userId), 'CLIENT_LEVEL');
  });

  it('no longer requires a visibilityScope in the request', async () => {
    const r = await pendingRequest('EMPLOYEE');
    const res = await approve(r.requestId, { role: 'EMPLOYEE' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(await storedScope(r.userId), 'TENANT_WIDE');
  });

  it('still rejects an unknown scope value', async () => {
    const r = await pendingRequest('EMPLOYEE');
    const res = await approve(r.requestId, { role: 'EMPLOYEE', visibilityScope: 'EVERYTHING' });
    assert.equal(res.status, 400, JSON.stringify(res.body));
  });
});
