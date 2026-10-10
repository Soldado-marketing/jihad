/**
 * Security gate - real session endpoints (MAOS-T24).
 *
 * GET /sessions/current and POST /sessions/revoke used to return placeholder
 * objects ("revoked") without touching anything. These tests drive the real
 * app over HTTP against PostgreSQL and prove:
 *
 *   - GET /sessions lists only the caller's own active sessions in the token's
 *     tenant, marks the current one and never exposes the token hash;
 *   - GET /sessions/current describes the session behind the access token;
 *   - POST /sessions/revoke really revokes: that session's access token and
 *     refresh token stop working at once, other sessions keep working;
 *   - another user's session, another tenant's session, an unknown id and an
 *     already revoked id all answer the same 404 and change nothing.
 *
 * Prerequisites (otherwise the whole suite skips rather than failing):
 *   1. npm run build                     (this file imports from dist/)
 *   2. a PostgreSQL database with migrations applied
 *   3. DATABASE_URL + JWT_SECRET set
 *   4. MAOS_INTEGRATION=1
 *
 * Seeds its own tenants directly (never through /auth/bootstrap), so it shares
 * a database safely with the other integration suites.
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

const RUN = `ss${Date.now().toString(36)}`;
const PASSWORD = 'SessionsPass123!';
const slug = `tenant-${RUN}`;

let app;
let server;
let request;
let prisma;
let tenantId = '';
let owner;
let otherSlug = '';

async function seedMember(role, label, inTenant = () => tenantId) {
  const bcrypt = require('bcrypt');
  const email = `${label}-${RUN}@example.test`;
  const user = await prisma.user.create({
    data: { email, displayName: `${label} ${RUN}`, passwordHash: await bcrypt.hash(PASSWORD, 10), status: 'APPROVED' },
    select: { id: true },
  });
  await prisma.tenantMembership.create({
    data: { tenantId: inTenant(), userId: user.id, role, status: 'ACTIVE', visibilityScope: 'TENANT_WIDE' },
  });
  return { email, id: user.id };
}

async function login(email, tenantSlug = slug) {
  return request(server).post('/api/auth/login').send({ email, passwordOrMagicCode: PASSWORD, tenantSlug });
}

async function loginOk(email, tenantSlug = slug) {
  const res = await login(email, tenantSlug);
  assert.equal(res.status, 200, `login failed for ${email}: ${JSON.stringify(res.body)}`);
  return { access: res.body.tokens.accessToken, refresh: res.body.tokens.refreshToken };
}

const me = (access) => request(server).get('/api/auth/me').set('Authorization', `Bearer ${access}`);
const refresh = (refreshToken) => request(server).post('/api/auth/refresh').send({ refreshToken });

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

  const tenant = await prisma.tenant.create({
    data: { name: `Tenant ${RUN}`, slug, status: 'ACTIVE' },
    select: { id: true },
  });
  tenantId = tenant.id;
  owner = await seedMember('OWNER', 'owner');
});

after(async () => {
  if (app) await app.close();
});

const auth = (r, access) => r.set('Authorization', `Bearer ${access}`);
const list = (access) => auth(request(server).get('/api/sessions'), access);
const current = (access) => auth(request(server).get('/api/sessions/current'), access);
const revoke = (access, sessionId) => auth(request(server).post('/api/sessions/revoke'), access).send({ sessionId });

async function sessionIdOf(access) {
  const res = await current(access);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.id;
}

describe('Sessions - own sessions only', { skip }, () => {
  let a;
  let b;
  let colleague;
  let foreign;
  let elsewhere;

  before(async () => {
    a = await loginOk(owner.email);
    b = await loginOk(owner.email);
    a.id = await sessionIdOf(a.access);
    b.id = await sessionIdOf(b.access);

    const c = await seedMember('EMPLOYEE', 'colleague');
    colleague = { ...c, ...(await loginOk(c.email)) };
    colleague.id = await sessionIdOf(colleague.access);

    otherSlug = `other-${RUN}`;
    const other = await prisma.tenant.create({
      data: { name: `Other ${RUN}`, slug: otherSlug, status: 'ACTIVE' },
      select: { id: true },
    });
    const f = await seedMember('OWNER', 'foreign', () => other.id);
    foreign = { ...f, ...(await loginOk(f.email, otherSlug)) };
    foreign.id = await sessionIdOf(foreign.access);

    // The same owner is also a member of the other tenant: that session belongs
    // to them, but not to the tenant their current token acts in.
    await prisma.tenantMembership.create({
      data: { tenantId: other.id, userId: owner.id, role: 'EMPLOYEE', status: 'ACTIVE', visibilityScope: 'TENANT_WIDE' },
    });
    elsewhere = await loginOk(owner.email, otherSlug);
    elsewhere.id = await sessionIdOf(elsewhere.access);
  });

  it('GET /sessions/current describes the session behind the token', async () => {
    const res = await current(a.access);
    assert.equal(res.status, 200);
    assert.equal(res.body.id, a.id);
    assert.equal(res.body.status, 'ACTIVE');
    assert.equal(res.body.current, true);
    assert.notEqual(a.id, b.id);
    assert.doesNotMatch(JSON.stringify(res.body), /placeholder|tokenHash/);
  });

  it('GET /sessions lists only the caller\'s active sessions and marks the current one', async () => {
    const res = await list(a.access);
    assert.equal(res.status, 200);
    const ids = res.body.items.map((s) => s.id);
    assert.ok(ids.includes(a.id) && ids.includes(b.id), JSON.stringify(ids));
    assert.ok(!ids.includes(colleague.id), 'a colleague\'s session is listed');
    assert.ok(!ids.includes(foreign.id), 'another tenant\'s session is listed');
    assert.ok(!ids.includes(elsewhere.id), 'the caller\'s session in another tenant is listed');
    assert.deepEqual(res.body.items.filter((s) => s.current).map((s) => s.id), [a.id]);
    assert.doesNotMatch(JSON.stringify(res.body), /tokenHash/);
  });

  it('cannot revoke a colleague\'s session (404, still valid)', async () => {
    const res = await revoke(a.access, colleague.id);
    assert.equal(res.status, 404);
    assert.equal((await me(colleague.access)).status, 200);
    const row = await prisma.session.findUnique({ where: { id: colleague.id }, select: { status: true } });
    assert.equal(row.status, 'ACTIVE');
  });

  it('cannot revoke another tenant\'s session (404, still valid)', async () => {
    const res = await revoke(a.access, foreign.id);
    assert.equal(res.status, 404);
    assert.equal((await me(foreign.access)).status, 200);
  });

  it('cannot revoke the caller\'s own session in another tenant from this tenant', async () => {
    assert.equal((await revoke(a.access, elsewhere.id)).status, 404);
    assert.equal((await me(elsewhere.access)).status, 200);
  });

  it('answers 404 for an unknown session id and 400 for a malformed one', async () => {
    assert.equal((await revoke(a.access, 'c-unknown-session-id')).status, 404);
    assert.equal((await revoke(a.access, 'x')).status, 400);
  });

  it('revokes another own session: its access and refresh tokens stop working', async () => {
    const res = await revoke(a.access, b.id);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(res.body, { sessionId: b.id, status: 'REVOKED' });

    assert.equal((await me(b.access)).status, 401);
    assert.equal((await refresh(b.refresh)).status, 401);
    assert.equal((await me(a.access)).status, 200, 'the calling session must keep working');

    const ids = (await list(a.access)).body.items.map((s) => s.id);
    assert.ok(!ids.includes(b.id), 'a revoked session is still listed');
  });

  it('answers 404 when revoking an already revoked session', async () => {
    assert.equal((await revoke(a.access, b.id)).status, 404);
  });

  it('can revoke the current session, which then stops working', async () => {
    assert.equal((await revoke(a.access, a.id)).status, 200);
    assert.equal((await me(a.access)).status, 401);
    assert.equal((await refresh(a.refresh)).status, 401);
  });
});
