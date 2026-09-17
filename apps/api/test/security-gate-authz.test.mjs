/**
 * Security & Reliability Gate 2 - controller authorisation, over real HTTP.
 *
 * Boots the real Nest application against a real PostgreSQL database and drives
 * it with supertest, the same shape as integration-api.test.mjs. Source-text
 * assertions cannot prove a guard is wired: a controller can carry every
 * decorator and still answer 200 if its module never imported PermissionsModule.
 * These tests fail in that case, which is the point.
 *
 * Requirements (identical to integration-api.test.mjs):
 *   1. npm run build                (this file imports from dist/)
 *   2. npx prisma migrate deploy    (against an EMPTY database)
 *   3. DATABASE_URL + JWT_SECRET set
 *   4. MAOS_INTEGRATION=1
 *
 * Without those the suite skips rather than failing, so an unconfigured machine
 * never turns red.
 *
 * Run: MAOS_INTEGRATION=1 node --test test/security-gate-authz.test.mjs
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

const RUN = `az${Date.now().toString(36)}`;
const PASSWORD = 'GateCheckPass123!';

let app;
let server;
let request;
let prisma;

const token = { owner: '', employee: '', client: '' };
const userId = { owner: '', employee: '', client: '' };
let tenantId = '';

const as = (who, req) => req.set('Authorization', `Bearer ${token[who]}`);

/**
 * Creates a member directly in the database.
 *
 * Roles other than OWNER have no self-service creation path - registration
 * lands in PENDING and needs an owner to approve and assign a role - so seeding
 * the row is the only way to get a CLIENT session without exercising three
 * unrelated flows inside an authorisation test.
 */
async function seedMember(role, explicitEmail) {
  const bcrypt = require('bcrypt');
  const email = explicitEmail ?? `${role.toLowerCase()}-${RUN}@example.test`;

  const user = await prisma.user.create({
    data: {
      email,
      displayName: `${role} ${RUN}`,
      passwordHash: await bcrypt.hash(PASSWORD, 10),
      status: 'APPROVED',
    },
    select: { id: true },
  });

  await prisma.tenantMembership.create({
    data: {
      tenantId,
      userId: user.id,
      role,
      status: 'ACTIVE',
      visibilityScope: role === 'CLIENT' ? 'CLIENT_LEVEL' : 'TENANT_WIDE',
    },
  });

  return { email, id: user.id };
}

async function login(email, tenantSlug) {
  const res = await request(server)
    .post('/api/auth/login')
    .send({ email, passwordOrMagicCode: PASSWORD, tenantSlug });

  assert.equal(res.status, 200, `login failed for ${email}: ${JSON.stringify(res.body)}`);
  return res.body.tokens.accessToken;
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
  app.useGlobalPipes(
    new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }),
  );
  await app.init();

  server = app.getHttpServer();
  request = require('supertest');

  const { PrismaService } = require(join(apiRoot, 'dist/modules/prisma/prisma.service.js'));
  prisma = app.get(PrismaService);

  // The tenant and its owner are seeded directly rather than through
  // /auth/bootstrap. Bootstrap is one-time across the whole database, so a suite
  // that depends on it can only ever run first; seeding makes this suite
  // order-independent and lets it share a database with the other integration
  // suites.
  const slug = `tenant-${RUN}`;
  const ownerEmail = `owner-${RUN}@example.test`;

  const tenant = await prisma.tenant.create({
    data: { name: `Tenant ${RUN}`, slug, status: 'ACTIVE' },
    select: { id: true },
  });
  tenantId = tenant.id;

  const owner = await seedMember('OWNER', ownerEmail);
  userId.owner = owner.id;
  token.owner = await login(owner.email, slug);

  const employee = await seedMember('EMPLOYEE');
  userId.employee = employee.id;
  token.employee = await login(employee.email, slug);

  const client = await seedMember('CLIENT');
  userId.client = client.id;
  token.client = await login(client.email, slug);
});

after(async () => {
  if (app) await app.close();
});

// ── 1. Nothing formerly unguarded answers without a session ──────────────────

describe('Gate 2 - unauthenticated access', { skip }, () => {
  const routes = [
    ['get', '/api/sessions/current'],
    ['post', '/api/sessions/revoke'],
    ['get', '/api/login-history'],
    ['get', '/api/devices'],
    ['get', '/api/tenant-context'],
    ['get', '/api/voice-notes'],
    ['post', '/api/voice-notes'],
    ['get', '/api/users/me'],
    ['get', '/api/users/members'],
    ['get', '/api/notifications'],
    ['get', '/api/admin/users/requests'],
  ];

  for (const [method, path] of routes) {
    it(`rejects ${method.toUpperCase()} ${path}`, async () => {
      const res = await request(server)[method](path);
      assert.equal(res.status, 401, `expected 401 for ${path}, got ${res.status}`);
    });
  }

  it('does not leak a tenant context to an anonymous caller', async () => {
    const res = await request(server)
      .get('/api/tenant-context')
      .set('x-tenant-id', 'some-other-tenant');

    assert.equal(res.status, 401, 'headers must not substitute for a session');
  });
});

// ── 2. Self-scoped routes answer for their own session ───────────────────────

describe('Gate 2 - self-scoped routes', { skip }, () => {
  for (const path of ['/api/sessions/current', '/api/login-history', '/api/devices']) {
    it(`serves ${path} to an authenticated member of any role`, async () => {
      for (const who of ['owner', 'employee', 'client']) {
        const res = await as(who, request(server).get(path));
        assert.equal(res.status, 200, `${who} got ${res.status} for ${path}`);
      }
    });
  }

  it('/users/me returns the caller, not another user', async () => {
    const res = await as('client', request(server).get('/api/users/me'));
    assert.equal(res.status, 200);
    assert.equal(res.body.id, userId.client);
    assert.equal(res.body.role, 'CLIENT');
  });

  it('/users/me never returns a password hash', async () => {
    const res = await as('owner', request(server).get('/api/users/me'));
    assert.doesNotMatch(JSON.stringify(res.body), /passwordHash/i);
  });
});

// ── 3 & 4. Voice notes follow the permission matrix ──────────────────────────

describe('Gate 2 - voice notes', { skip }, () => {
  it('denies a CLIENT every voice-note action', async () => {
    const list = await as('client', request(server).get('/api/voice-notes'));
    assert.equal(list.status, 403, `CLIENT list: ${JSON.stringify(list.body)}`);

    const create = await as('client', request(server).post('/api/voice-notes'))
      .send({ title: `${RUN} client note` });
    assert.equal(create.status, 403);

    const remove = await as('client', request(server).delete('/api/voice-notes/any-id'));
    assert.equal(remove.status, 403);
  });

  it('leaks nothing about voice notes in the denial', async () => {
    const res = await as('client', request(server).get('/api/voice-notes'));
    const body = JSON.stringify(res.body);
    assert.doesNotMatch(body, /title/i);
    assert.match(body, /FORBIDDEN/);
  });

  it('allows an EMPLOYEE to read and write voice notes', async () => {
    const created = await as('employee', request(server).post('/api/voice-notes'))
      .send({ title: `${RUN} employee note` });
    assert.equal(created.status, 201, JSON.stringify(created.body));

    const list = await as('employee', request(server).get('/api/voice-notes'));
    assert.equal(list.status, 200);
    assert.ok(list.body.some((note) => note.id === created.body.id));

    const removed = await as('employee', request(server).delete(`/api/voice-notes/${created.body.id}`));
    assert.equal(removed.status, 204);
  });

  it('allows an OWNER to read voice notes', async () => {
    const res = await as('owner', request(server).get('/api/voice-notes'));
    assert.equal(res.status, 200);
  });
});

// ── 5 & 6. The member roster is not a client-readable resource ───────────────

describe('Gate 2 - users/members', { skip }, () => {
  it('denies a CLIENT the member roster', async () => {
    const res = await as('client', request(server).get('/api/users/members'));
    assert.equal(res.status, 403, JSON.stringify(res.body));
  });

  it('leaks no address in the denial', async () => {
    const res = await as('client', request(server).get('/api/users/members'));
    assert.doesNotMatch(JSON.stringify(res.body), /@example\.test/);
  });

  it('serves the roster to an OWNER', async () => {
    const res = await as('owner', request(server).get('/api/users/members'));
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.some((member) => member.id === userId.owner));
  });
});

// ── 7. Owner-only administration ─────────────────────────────────────────────

describe('Gate 2 - admin/users', { skip }, () => {
  const ownerOps = [
    ['get', '/api/admin/users/requests'],
    ['post', '/api/admin/users/some-user/suspend'],
    ['post', '/api/admin/users/some-user/reactivate'],
  ];

  for (const [method, path] of ownerOps) {
    it(`denies a non-owner ${method.toUpperCase()} ${path}`, async () => {
      for (const who of ['employee', 'client']) {
        const res = await as(who, request(server)[method](path));
        assert.ok(
          [401, 403].includes(res.status),
          `${who} got ${res.status} for ${path}: ${JSON.stringify(res.body)}`,
        );
      }
    });
  }

  it('serves the request list to an OWNER', async () => {
    const res = await as('owner', request(server).get('/api/admin/users/requests'));
    assert.equal(res.status, 200);
  });
});

// ── 8. Notifications stay inside one user ────────────────────────────────────

describe('Gate 2 - notifications', { skip }, () => {
  let ownerNotificationId;

  before(async () => {
    if (skip) return;
    const created = await prisma.notification.create({
      data: {
        tenantId,
        recipientUserId: userId.owner,
        title: `${RUN} owner-only notification`,
      },
      select: { id: true },
    });
    ownerNotificationId = created.id;
  });

  it('does not show one member the notification of another', async () => {
    const res = await as('client', request(server).get('/api/notifications'));
    assert.equal(res.status, 200);

    const body = JSON.stringify(res.body);
    assert.doesNotMatch(body, new RegExp(ownerNotificationId));
    assert.doesNotMatch(body, /owner-only notification/);
  });

  it('counts only the caller\'s unread notifications', async () => {
    const client = await as('client', request(server).get('/api/notifications/unread-count'));
    assert.equal(client.status, 200);
    assert.equal(JSON.stringify(client.body).includes('1'), false, JSON.stringify(client.body));

    const owner = await as('owner', request(server).get('/api/notifications/unread-count'));
    assert.equal(owner.status, 200);
  });

  it('does not let one member mark another\'s notification read', async () => {
    const res = await as('client', request(server).patch(`/api/notifications/${ownerNotificationId}/read`));

    // The write is an updateMany scoped by recipientUserId, so a foreign id
    // simply matches nothing. The route answers 200 with a zero count rather
    // than 404 - loose as a contract, but it modifies nothing and discloses
    // nothing, which is what this gate is about. The row below is the proof.
    assert.ok(res.status < 500, `unexpected status ${res.status}`);
    assert.doesNotMatch(JSON.stringify(res.body), /owner-only notification/);

    const still = await prisma.notification.findUnique({
      where: { id: ownerNotificationId },
      select: { readAt: true, status: true },
    });
    assert.equal(still.readAt, null, 'another member must not be able to mark it read');
    assert.equal(still.status, 'UNREAD');
  });
});

// ── 9 & 10. The two deliberately public surfaces ─────────────────────────────

describe('Gate 2 - deliberately public routes', { skip }, () => {
  it('serves liveness and readiness without a session', async () => {
    const live = await request(server).get('/api/health');
    assert.equal(live.status, 200);

    const ready = await request(server).get('/api/health/ready');
    assert.equal(ready.status, 200);
  });

  it('leaks no connection detail from readiness', async () => {
    const res = await request(server).get('/api/health/ready');
    const body = JSON.stringify(res.body);
    assert.doesNotMatch(body, /postgres:\/\/|postgresql:\/\/|password|@/i);
  });

  it('keeps invite acceptance reachable before authentication', async () => {
    const res = await request(server)
      .post('/api/invites/accept')
      .send({ email: `invitee-${RUN}@example.test`, token: 'not-a-real-token' });

    assert.notEqual(res.status, 401, 'invite acceptance must work before a session exists');
  });

  it('keeps public registration closed and creates no account from an invite call', async () => {
    const email = `invitee2-${RUN}@example.test`;
    const res = await request(server)
      .post('/api/invites/accept')
      .send({ email, token: 'not-a-real-token' });

    if (res.status < 400) {
      assert.equal(res.body.publicRegistration, false);
    }

    // The trust boundary is the token: an unverified call must not mint a user.
    const created = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    assert.equal(created, null, 'an unverified invite must not create an account');
  });

  it('keeps owner bootstrap closed once an owner exists', async () => {
    const res = await request(server).post('/api/auth/bootstrap').send({
      email: `second-owner-${RUN}@example.test`,
      fullName: 'Second Owner',
      password: PASSWORD,
      tenantName: `Second ${RUN}`,
      tenantSlug: `second-${RUN}`,
    });

    assert.equal(res.status, 403, JSON.stringify(res.body));
  });
});
