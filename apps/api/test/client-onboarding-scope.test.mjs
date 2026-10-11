/**
 * Client onboarding assigns the client scope (MAOS F-1).
 *
 * A CLIENT is isolated by TenantMembership.clientScopeKey and the portal fails
 * closed without one. Approval never set it, so a client approved through the
 * admin UI got 403 everywhere in the portal. Now approving - or changing a
 * role to - CLIENT requires a clientScopeKey, other roles may not carry one
 * (and lose it when they leave CLIENT), and the client sees exactly their own
 * client's data. Drives the real app over HTTP.
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

const RUN = `co${Date.now().toString(36)}`;
const PASSWORD = 'OnboardingPass123!';

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

const membership = (userId) =>
  prisma.tenantMembership.findUnique({ where: { tenantId_userId: { tenantId, userId } }, select: { role: true, clientScopeKey: true } });
const changeRole = (userId, body) =>
  request(server).patch(`/api/admin/users/${userId}/role`).set('Authorization', `Bearer ${token}`).send(body);
async function portalProjects(email) {
  const res = await request(server).post('/api/auth/login').send({ email, passwordOrMagicCode: PASSWORD, tenantSlug: `tenant-${RUN}` });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return request(server).get('/api/client/projects').set('Authorization', `Bearer ${res.body.tokens.accessToken}`);
}

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

  for (const key of ['acme', 'globex']) {
    await prisma.project.create({
      data: { tenantId, name: `${key} project ${RUN}`, clientVisible: true, clientScopeKey: `${key}-${RUN}` },
    });
  }
});

after(async () => {
  if (app) await app.close();
});

describe('client onboarding scope', { skip }, () => {
  it('refuses to approve a CLIENT without a clientScopeKey and changes nothing', async () => {
    const r = await pendingRequest('CLIENT');
    const res = await approve(r.requestId, { role: 'CLIENT' });
    assert.equal(res.status, 400, JSON.stringify(res.body));
    assert.match(JSON.stringify(res.body), /CLIENT_SCOPE_REQUIRED/);
    assert.equal(await membership(r.userId), null);
    const user = await prisma.user.findUnique({ where: { id: r.userId }, select: { status: true } });
    assert.equal(user.status, 'PENDING_APPROVAL');
  });

  it('approves a CLIENT with a key, who then sees only their own client in the portal', async () => {
    const r = await pendingRequest('CLIENT');
    const res = await approve(r.requestId, { role: 'CLIENT', clientScopeKey: `acme-${RUN}` });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(await membership(r.userId), { role: 'CLIENT', clientScopeKey: `acme-${RUN}` });

    const portal = await portalProjects(r.email);
    assert.equal(portal.status, 200, JSON.stringify(portal.body));
    assert.deepEqual(portal.body.map((p) => p.name), [`acme project ${RUN}`]);
  });

  it('refuses a clientScopeKey for a non-client role and a malformed key', async () => {
    const r = await pendingRequest('EMPLOYEE');
    const res = await approve(r.requestId, { role: 'EMPLOYEE', clientScopeKey: `acme-${RUN}` });
    assert.equal(res.status, 400);
    assert.match(JSON.stringify(res.body), /CLIENT_SCOPE_NOT_ALLOWED/);
    for (const bad of ['', ' acme', 'acme corp', 'a/b', 'x'.repeat(121)]) {
      const c = await pendingRequest('CLIENT');
      assert.equal((await approve(c.requestId, { role: 'CLIENT', clientScopeKey: bad })).status, 400, `accepted ${JSON.stringify(bad)}`);
    }
  });

  it('repairs an already approved client without a key through role change', async () => {
    // The state F-1 left behind: a CLIENT membership with no key.
    const r = await pendingRequest('CLIENT');
    await prisma.user.update({ where: { id: r.userId }, data: { status: 'APPROVED' } });
    await prisma.tenantMembership.create({
      data: { tenantId, userId: r.userId, role: 'CLIENT', status: 'ACTIVE', visibilityScope: 'CLIENT_LEVEL' },
    });
    assert.equal((await portalProjects(r.email)).status, 403, 'fails closed without a key');

    assert.equal((await changeRole(r.userId, { role: 'CLIENT' })).status, 400, 'a key is still required');
    const res = await changeRole(r.userId, { role: 'CLIENT', clientScopeKey: `globex-${RUN}` });
    assert.equal(res.status, 200, JSON.stringify(res.body));

    const portal = await portalProjects(r.email);
    assert.equal(portal.status, 200);
    assert.deepEqual(portal.body.map((p) => p.name), [`globex project ${RUN}`]);

    const roleChange = await prisma.auditEvent.findFirst({
      where: { tenantId, resourceId: r.userId, action: 'role.changed' },
      orderBy: { createdAt: 'desc' },
      select: { redactedPayload: true },
    });
    assert.match(JSON.stringify(roleChange?.redactedPayload), new RegExp(`globex-${RUN}`));
  });

  it('clears the key when a client moves to an internal role, and refuses a key for it', async () => {
    const r = await pendingRequest('CLIENT');
    assert.equal((await approve(r.requestId, { role: 'CLIENT', clientScopeKey: `acme-${RUN}` })).status, 200);
    assert.equal((await changeRole(r.userId, { role: 'EMPLOYEE', clientScopeKey: `acme-${RUN}` })).status, 400);
    assert.equal((await changeRole(r.userId, { role: 'EMPLOYEE' })).status, 200);
    assert.deepEqual(await membership(r.userId), { role: 'EMPLOYEE', clientScopeKey: null });
  });
});
