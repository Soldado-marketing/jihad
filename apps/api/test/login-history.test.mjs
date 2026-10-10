/**
 * Login history - writers and own-history reader (MAOS-T25).
 *
 * The LoginHistory model existed but nothing wrote it, and GET
 * /api/login-history returned a placeholder. These tests drive the real app
 * over HTTP against PostgreSQL and prove:
 *
 *   - a successful login records SUCCESS with the user and tenant;
 *   - a wrong password and an unknown email record FAILURE (the unknown email
 *     without a user link), and a suspended account records BLOCKED;
 *   - the client IP is stored only as a keyed hash, never in clear, and an
 *     oversized user agent is truncated;
 *   - GET /api/login-history returns the caller's own entries only, newest
 *     first, without the IP hash or the email;
 *   - the login response itself is unchanged.
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

const RUN = `lh${Date.now().toString(36)}`;
const PASSWORD = 'HistoryPass123!';
const slug = `tenant-${RUN}`;
const LONG_UA = `MAOS-Test-Agent/${'x'.repeat(600)}`;

let app;
let server;
let request;
let prisma;
let tenantId = '';
const users = {};

async function seedMember(label, status = 'APPROVED') {
  const bcrypt = require('bcrypt');
  const email = `${label}-${RUN}@example.test`;
  const user = await prisma.user.create({
    data: { email, displayName: label, passwordHash: await bcrypt.hash(PASSWORD, 10), status },
    select: { id: true },
  });
  await prisma.tenantMembership.create({
    data: { tenantId, userId: user.id, role: 'EMPLOYEE', status: 'ACTIVE', visibilityScope: 'TENANT_WIDE' },
  });
  return { email, id: user.id };
}

const login = (email, password = PASSWORD) =>
  request(server)
    .post('/api/auth/login')
    .set('User-Agent', LONG_UA)
    .send({ email, passwordOrMagicCode: password, tenantSlug: slug });

const historyRows = (where) => prisma.loginHistory.findMany({ where, orderBy: { createdAt: 'asc' } });

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

  const tenant = await prisma.tenant.create({ data: { name: `Tenant ${RUN}`, slug, status: 'ACTIVE' }, select: { id: true } });
  tenantId = tenant.id;
  users.alice = await seedMember('alice');
  users.bob = await seedMember('bob');
  users.suspended = await seedMember('suspended', 'SUSPENDED');
});

after(async () => {
  if (app) await app.close();
});

describe('login history - writers', { skip }, () => {
  it('records SUCCESS for a successful login, with user and tenant', async () => {
    const res = await login(users.alice.email);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok(res.body.tokens?.accessToken, 'login response unchanged');
    users.alice.token = res.body.tokens.accessToken;

    const rows = await historyRows({ userId: users.alice.id, outcome: 'SUCCESS' });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].tenantId, tenantId);
    assert.equal(rows[0].email, users.alice.email);
  });

  it('stores the IP only as a keyed hash and truncates the user agent', async () => {
    const [row] = await historyRows({ userId: users.alice.id, outcome: 'SUCCESS' });
    assert.match(row.ipHash ?? '', /^[0-9a-f]{64}$/);
    assert.ok(!/127\.0\.0\.1|::1/.test(row.ipHash), 'raw IP must not be stored');
    assert.ok(row.userAgent.startsWith('MAOS-Test-Agent/'));
    assert.ok(row.userAgent.length <= 255, `user agent not truncated: ${row.userAgent.length}`);
  });

  it('records FAILURE for a wrong password, linked to the user', async () => {
    const res = await login(users.alice.email, 'WrongPassword999!');
    assert.equal(res.status, 401);
    const rows = await historyRows({ userId: users.alice.id, outcome: 'FAILURE' });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].reason, 'INVALID_CREDENTIALS');
  });

  it('records FAILURE for an unknown email, with no user link', async () => {
    const email = `nobody-${RUN}@example.test`;
    const res = await login(email);
    assert.equal(res.status, 401);
    const rows = await historyRows({ email, outcome: 'FAILURE' });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].userId, null);
    assert.equal(rows[0].tenantId, null);
  });

  it('records BLOCKED with the reason for a suspended account', async () => {
    const res = await login(users.suspended.email);
    assert.notEqual(res.status, 200);
    const rows = await historyRows({ userId: users.suspended.id, outcome: 'BLOCKED' });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].reason, 'SUSPENDED');
  });
});

describe('login history - own-history reader', { skip }, () => {
  it('rejects an unauthenticated request', async () => {
    assert.equal((await request(server).get('/api/login-history')).status, 401);
  });

  it("returns only the caller's own entries, newest first, without IP hash or email", async () => {
    const bobLogin = await login(users.bob.email);
    assert.equal(bobLogin.status, 200);

    const res = await request(server).get('/api/login-history').set('Authorization', `Bearer ${users.alice.token}`);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok(Array.isArray(res.body.items), 'expected { items: [] }');
    const items = res.body.items;
    assert.deepEqual(items.map((i) => i.outcome), ['FAILURE', 'SUCCESS']);
    const ids = new Set((await historyRows({ userId: users.alice.id })).map((r) => r.id));
    for (const item of items) {
      assert.ok(ids.has(item.id), 'foreign entry returned');
      assert.equal(item.ipHash, undefined);
      assert.equal(item.email, undefined);
      assert.equal(item.userId, undefined);
    }
  });

  it('gives another user their own history only', async () => {
    const t = (await login(users.bob.email)).body.tokens.accessToken;
    const res = await request(server).get('/api/login-history').set('Authorization', `Bearer ${t}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.items.length >= 2);
    assert.ok(res.body.items.every((i) => i.outcome === 'SUCCESS'));
  });
});
