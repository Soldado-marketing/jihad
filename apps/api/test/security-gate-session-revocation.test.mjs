/**
 * Security gate - suspended or non-active users lose access immediately (MAOS-T23).
 *
 * Before this gate, suspending a user only changed User.status. Every access
 * token and refresh token already issued kept working, because neither the
 * per-request session check nor refresh looked at the user's status. These
 * tests drive the real app over HTTP against PostgreSQL and prove:
 *
 *   - suspending a user revokes their sessions: existing access tokens and
 *     refresh tokens are rejected at once, and they cannot log in again;
 *   - reactivation allows a fresh login, while the revoked tokens stay dead;
 *   - a user whose status is changed by any other path (for example DISABLED
 *     directly in the database) is rejected on the next request and refresh;
 *   - a suspended membership in the session's tenant is rejected the same way;
 *   - unaffected users (the owner) keep working throughout.
 *
 * Prerequisites (otherwise the whole suite skips rather than failing):
 *   1. npm run build                     (this file imports from dist/)
 *   2. a PostgreSQL database with migrations applied
 *   3. DATABASE_URL + JWT_SECRET set
 *   4. MAOS_INTEGRATION=1
 *
 * Seeds its own tenant directly (never through /auth/bootstrap), so it shares
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

const RUN = `sr${Date.now().toString(36)}`;
const PASSWORD = 'RevocationPass123!';
const slug = `tenant-${RUN}`;

let app;
let server;
let request;
let prisma;
let tenantId = '';
let owner;

async function seedMember(role, label) {
  const bcrypt = require('bcrypt');
  const email = `${label}-${RUN}@example.test`;
  const user = await prisma.user.create({
    data: { email, displayName: `${label} ${RUN}`, passwordHash: await bcrypt.hash(PASSWORD, 10), status: 'APPROVED' },
    select: { id: true },
  });
  await prisma.tenantMembership.create({
    data: { tenantId, userId: user.id, role, status: 'ACTIVE', visibilityScope: 'TENANT_WIDE' },
  });
  return { email, id: user.id };
}

async function login(email) {
  return request(server).post('/api/auth/login').send({ email, passwordOrMagicCode: PASSWORD, tenantSlug: slug });
}

async function loginOk(email) {
  const res = await login(email);
  assert.equal(res.status, 200, `login failed for ${email}: ${JSON.stringify(res.body)}`);
  return { access: res.body.tokens.accessToken, refresh: res.body.tokens.refreshToken };
}

const me = (access) => request(server).get('/api/auth/me').set('Authorization', `Bearer ${access}`);
const tasks = (access) => request(server).get('/api/tasks').set('Authorization', `Bearer ${access}`);
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

  const seeded = await seedMember('OWNER', 'owner');
  owner = { ...seeded, ...(await loginOk(seeded.email)) };
});

after(async () => {
  if (app) await app.close();
});

describe('Gate - suspension through the admin endpoint', { skip }, () => {
  let employee;
  let tokens;

  before(async () => {
    if (skip) return;
    employee = await seedMember('EMPLOYEE', 'employee');
    tokens = await loginOk(employee.email);
  });

  it('works before suspension (baseline)', async () => {
    assert.equal((await me(tokens.access)).status, 200);
    assert.equal((await tasks(tokens.access)).status, 200);
  });

  it('lets the owner suspend the employee, revoking their sessions in the same step', async () => {
    const res = await request(server)
      .post(`/api/admin/users/${employee.id}/suspend`)
      .set('Authorization', `Bearer ${owner.access}`);
    assert.equal(res.status, 200, JSON.stringify(res.body));

    // Checked before any token is used again: a later refresh attempt also
    // revokes its session, which would otherwise hide a missing revocation here.
    const active = await prisma.session.count({ where: { userId: employee.id, status: 'ACTIVE' } });
    assert.equal(active, 0, 'suspension must revoke every active session immediately');
  });

  it('rejects the existing access token at once', async () => {
    assert.equal((await me(tokens.access)).status, 401);
    assert.equal((await tasks(tokens.access)).status, 401);
  });

  it('rejects the existing refresh token', async () => {
    assert.equal((await refresh(tokens.refresh)).status, 401);
  });

  it('revokes every session of the suspended user in the database', async () => {
    const active = await prisma.session.count({ where: { userId: employee.id, status: 'ACTIVE' } });
    assert.equal(active, 0);
    const revoked = await prisma.session.count({ where: { userId: employee.id, status: 'REVOKED' } });
    assert.ok(revoked >= 1);
  });

  it('refuses a new login while suspended', async () => {
    const res = await login(employee.email);
    assert.notEqual(res.status, 200);
    assert.equal(res.body?.tokens, undefined);
  });

  it('allows a fresh login after reactivation, while the old tokens stay revoked', async () => {
    const res = await request(server)
      .post(`/api/admin/users/${employee.id}/reactivate`)
      .set('Authorization', `Bearer ${owner.access}`);
    assert.equal(res.status, 200, JSON.stringify(res.body));

    const fresh = await loginOk(employee.email);
    assert.equal((await me(fresh.access)).status, 200);
    assert.equal((await me(tokens.access)).status, 401);
    assert.equal((await refresh(tokens.refresh)).status, 401);
  });
});

describe('Gate - status changed outside the suspend endpoint', { skip }, () => {
  it('rejects access and refresh for a user set to DISABLED', async () => {
    const user = await seedMember('EMPLOYEE', 'disabled');
    const t = await loginOk(user.email);
    assert.equal((await me(t.access)).status, 200);

    await prisma.user.update({ where: { id: user.id }, data: { status: 'DISABLED' } });

    assert.equal((await me(t.access)).status, 401);
    assert.equal((await tasks(t.access)).status, 401);
    assert.equal((await refresh(t.refresh)).status, 401);
  });

  it('rejects access and refresh when the membership in the session tenant is suspended', async () => {
    const user = await seedMember('EMPLOYEE', 'membership');
    const t = await loginOk(user.email);
    assert.equal((await me(t.access)).status, 200);

    await prisma.tenantMembership.update({
      where: { tenantId_userId: { tenantId, userId: user.id } },
      data: { status: 'SUSPENDED' },
    });

    assert.equal((await me(t.access)).status, 401);
    assert.equal((await refresh(t.refresh)).status, 401);
  });
});

describe('Gate - unaffected users keep working', { skip }, () => {
  it('keeps the owner session valid throughout', async () => {
    assert.equal((await me(owner.access)).status, 200);
    const r = await refresh(owner.refresh);
    assert.equal(r.status, 200, JSON.stringify(r.body));
  });
});
