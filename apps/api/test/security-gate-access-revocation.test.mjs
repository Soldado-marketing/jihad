/**
 * E08 - access revocation on removal and suspension, as one named gate.
 * Removal from a company and suspension of an account must end every working
 * session at once, for every role, on that role's own routes, and leave a
 * record. The pieces already existed (#126; security-gate-member-management
 * and security-gate-session-revocation cover an EMPLOYEE on /tasks); this
 * suite adds what they do not assert: every non-owner role, two open sessions
 * per person, the session rows themselves, the one-minute bound, the audit
 * record of both actions, and the other company of the same person.
 * Real Nest HTTP + isolated test database.
 * Run with MAOS_INTEGRATION=1, DATABASE_URL and JWT_SECRET, after migrations.
 * Requires a TEST database only; never point this suite at production.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { before, after, describe, it } from 'node:test';

const require = createRequire(import.meta.url);
const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const skip = process.env.MAOS_INTEGRATION !== '1' || !existsSync(join(apiRoot, 'dist/app.module.js'));
const RUN = 'ar' + Date.now().toString(36);
const PASSWORD = 'AccessRevocationTest123!';
/** The task's bound: a removed or suspended person is refused within the same minute. */
const BOUND_MS = 60_000;

/** One route each role may read while it is a member, so a 401 afterwards is the revocation and nothing else. */
const OWN_ROUTE = {
  MANAGER: '/api/projects',
  EMPLOYEE: '/api/tasks',
  CONTRACTOR: '/api/tasks',
  CLIENT: '/api/client/projects',
};
const ROLES = Object.keys(OWN_ROUTE);

let app, server, request, prisma;
const co = {};
const p = {};
let address = 0;

async function member(tenant, role, label, existingUserId) {
  const bcrypt = require('bcrypt');
  const user = existingUserId
    ? await prisma.user.findUnique({ where: { id: existingUserId } })
    : await prisma.user.create({
      data: { email: `${label}-${RUN}@example.test`, displayName: `${label} ${RUN}`, passwordHash: await bcrypt.hash(PASSWORD, 10), status: 'APPROVED' },
    });
  const m = await prisma.tenantMembership.create({
    data: { tenantId: tenant.id, userId: user.id, role, status: 'ACTIVE', ...(role === 'CLIENT' ? { clientScopeKey: `cust-${tenant.slug}` } : {}) },
  });
  return { id: user.id, email: user.email, membershipId: m.id, role };
}
/**
 * Each sign-in comes from its own address, as separate devices do behind the
 * proxy in production: the sign-in limit (10 a minute per address) stays in
 * force and is not what this suite measures.
 */
const signIn = (person, tenant) => request(server).post('/api/auth/login')
  .set('X-Forwarded-For', `10.8.${Math.floor(address / 250)}.${(address++ % 250) + 1}`)
  .send({ email: person.email, passwordOrMagicCode: PASSWORD, tenantSlug: tenant.slug });
async function login(person, tenant) {
  const res = await signIn(person, tenant);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.tokens;
}
const get = (token, path) => request(server).get(path).set('Authorization', `Bearer ${token}`);
const post = (token, path) => request(server).post(path).set('Authorization', `Bearer ${token}`);
const refresh = (refreshToken) => request(server).post('/api/auth/refresh').send({ refreshToken });
const sessions = (userId, tenantId, status) => prisma.session.count({ where: { userId, tenantId, status } });

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
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  await app.init();
  await app.listen(0, '127.0.0.1');
  server = app.getHttpServer();
  request = require('supertest');
  const { PrismaService } = require(join(apiRoot, 'dist/modules/prisma/prisma.service.js'));
  prisma = app.get(PrismaService);

  for (const k of ['a', 'b']) {
    co[k] = await prisma.tenant.create({ data: { name: `AR ${k} ${RUN}`, slug: `${RUN}-${k}`, status: 'ACTIVE' } });
    await prisma.customer.create({ data: { tenantId: co[k].id, name: `Customer ${k} ${RUN}`, clientScopeKey: `cust-${co[k].slug}`, status: 'ACTIVE' } });
  }
  p.owner = await member(co.a, 'OWNER', 'owner');
  p.ownerB = await member(co.b, 'OWNER', 'ownerb');
  p.stays = await member(co.a, 'EMPLOYEE', 'stays');
  for (const role of ROLES) {
    p[`removed${role}`] = await member(co.a, role, `removed-${role.toLowerCase()}`);
    p[`suspended${role}`] = await member(co.a, role, `suspended-${role.toLowerCase()}`);
  }
  // The removed employee also works in company B and must keep it.
  await member(co.b, 'EMPLOYEE', '', p.removedEMPLOYEE.id);
  // Assigned work, so a CONTRACTOR's own list is not empty by accident.
  const project = await prisma.project.create({ data: { tenantId: co.a.id, name: `Project ${RUN}`, status: 'ACTIVE' } });
  for (const who of [p.removedCONTRACTOR, p.suspendedCONTRACTOR]) {
    await prisma.task.create({ data: { tenantId: co.a.id, projectId: project.id, title: `Assigned ${RUN}`, assignedToUserId: who.id } });
  }

  p.ownerToken = (await login(p.owner, co.a)).accessToken;
  p.staysTokens = await login(p.stays, co.a);
});
after(async () => { if (app) await app.close(); });

describe('E08 - removal from the company ends every session at once, for every role', { skip }, () => {
  for (const role of ROLES) {
    it(`${role}: both open sessions are refused within the same minute, revoked and recorded`, async () => {
      const person = p[`removed${role}`];
      const route = OWN_ROUTE[role];
      const first = await login(person, co.a);
      const second = await login(person, co.a);
      const other = role === 'EMPLOYEE' ? await login(person, co.b) : null;
      for (const t of [first, second]) assert.equal((await get(t.accessToken, route)).status, 200, `${role} reads ${route} while a member`);
      assert.equal(await sessions(person.id, co.a.id, 'ACTIVE'), 2);

      const startedAt = Date.now();
      const res = await post(p.ownerToken, `/api/auth/company-members/${person.id}/remove`);
      assert.equal(res.status, 200, JSON.stringify(res.body));

      // Read before any token is used again: a refused refresh also revokes its
      // session, which would hide a removal that left the sessions open.
      assert.equal(await sessions(person.id, co.a.id, 'ACTIVE'), 0, 'no active session left in the company');
      assert.equal(await sessions(person.id, co.a.id, 'REVOKED'), 2, 'both sessions revoked by the removal');

      for (const t of [first, second]) {
        assert.equal((await get(t.accessToken, route)).status, 401, `${role}: access token refused on ${route}`);
        assert.equal((await get(t.accessToken, '/api/auth/me')).status, 401, `${role}: access token refused on /auth/me`);
        assert.equal((await refresh(t.refreshToken)).status, 401, `${role}: refresh token refused`);
      }
      const elapsed = Date.now() - startedAt;
      assert.ok(elapsed < BOUND_MS, `refused after ${elapsed} ms, bound ${BOUND_MS} ms`);

      const again = await signIn(person, co.a);
      assert.notEqual(again.status, 200, 'no new sign-in to the company');
      assert.equal(again.body?.tokens, undefined);

      const event = await prisma.auditEvent.findFirst({ where: { tenantId: co.a.id, action: 'membership.removed', resourceId: person.membershipId } });
      assert.ok(event, 'removal is recorded');
      assert.equal(event.actorId, p.owner.id);
      assert.equal(event.redactedPayload?.role, role);
      assert.equal(event.redactedPayload?.sessionsRevoked, 2);

      if (other) {
        assert.equal((await get(other.accessToken, '/api/tasks')).status, 200, 'the same person keeps company B');
        assert.equal(await sessions(person.id, co.b.id, 'ACTIVE'), 1, 'the session in company B stays open');
        assert.equal((await refresh(other.refreshToken)).status, 200, 'and still refreshes');
      }
    });
  }

  it('only the Owner of that company removes; another company\'s Owner and the members themselves do not', async () => {
    const target = p.suspendedEMPLOYEE;
    const ownerB = (await login(p.ownerB, co.b)).accessToken;
    assert.equal((await post(ownerB, `/api/auth/company-members/${target.id}/remove`)).status, 404, 'not a member of company B');
    assert.equal((await post(p.staysTokens.accessToken, `/api/auth/company-members/${target.id}/remove`)).status, 403, 'an employee');
    assert.equal(await sessions(target.id, co.a.id, 'REVOKED'), 0);
    const m = await prisma.tenantMembership.findUnique({ where: { id: target.membershipId }, select: { status: true } });
    assert.equal(m.status, 'ACTIVE', 'a refused removal changes nothing');
  });
});

describe('E08 - suspension ends every session at once, for every role, and is recorded', { skip }, () => {
  for (const role of ROLES) {
    it(`${role}: both open sessions are refused within the same minute, revoked and recorded`, async () => {
      const person = p[`suspended${role}`];
      const route = OWN_ROUTE[role];
      const first = await login(person, co.a);
      const second = await login(person, co.a);
      for (const t of [first, second]) assert.equal((await get(t.accessToken, route)).status, 200, `${role} reads ${route} before suspension`);

      const startedAt = Date.now();
      const res = await post(p.ownerToken, `/api/admin/users/${person.id}/suspend`);
      assert.equal(res.status, 200, JSON.stringify(res.body));

      assert.equal(await prisma.session.count({ where: { userId: person.id, status: 'ACTIVE' } }), 0, 'no active session left');
      assert.equal(await sessions(person.id, co.a.id, 'REVOKED'), 2, 'both sessions revoked by the suspension');

      for (const t of [first, second]) {
        assert.equal((await get(t.accessToken, route)).status, 401, `${role}: access token refused on ${route}`);
        assert.equal((await get(t.accessToken, '/api/auth/me')).status, 401, `${role}: access token refused on /auth/me`);
        assert.equal((await refresh(t.refreshToken)).status, 401, `${role}: refresh token refused`);
      }
      const elapsed = Date.now() - startedAt;
      assert.ok(elapsed < BOUND_MS, `refused after ${elapsed} ms, bound ${BOUND_MS} ms`);

      const again = await signIn(person, co.a);
      assert.notEqual(again.status, 200, 'no new sign-in while suspended');
      assert.equal(again.body?.tokens, undefined);

      const event = await prisma.auditEvent.findFirst({ where: { tenantId: co.a.id, action: 'user.suspended', resourceId: person.id } });
      assert.ok(event, 'suspension is recorded');
      assert.equal(event.actorId, p.owner.id);
      assert.equal(event.outcome, 'SUCCESS');
    });
  }
});

describe('E08 - people who were not removed or suspended keep working', { skip }, () => {
  it('a member of the same company and its Owner are untouched by all of the above', async () => {
    assert.equal((await get(p.staysTokens.accessToken, '/api/tasks')).status, 200);
    assert.equal((await refresh(p.staysTokens.refreshToken)).status, 200);
    assert.equal((await get(p.ownerToken, '/api/auth/me')).status, 200);
    assert.equal(await sessions(p.stays.id, co.a.id, 'REVOKED') <= 1, true, 'at most the session its own refresh rotated');
  });
});
