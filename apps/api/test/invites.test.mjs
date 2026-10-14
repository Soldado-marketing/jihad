/**
 * Invite flow (MAOS F-2).
 *
 * The OWNER invites an email into MANAGER, EMPLOYEE or CONTRACTOR; the person
 * accepts with the emailed single-use token, sets a name and password, and
 * signs in through the existing login. Every unusable token (unknown,
 * malformed, used, revoked, expired, suspended tenant) gets the same 400
 * INVITE_INVALID. Of concurrent acceptances exactly one wins.
 *
 * Prerequisites (otherwise the whole suite skips rather than failing):
 *   npm run build; migrated PostgreSQL; DATABASE_URL + JWT_SECRET; MAOS_INTEGRATION=1.
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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

const RUN = `iv${Date.now().toString(36)}`;
const PASSWORD = 'InvitePass123!';

let app;
let server;
let request;
let prisma;
let mail;
let tenantId = '';
let otherTenantId = '';
const people = {};
// Each public call gets its own client address, so the per-client throttle
// only bites in the test that is about it.
let ip = 0;
const client = () => `198.51.100.${(ip = (ip % 250) + 1)}`;

const create = (who, body) =>
  request(server).post('/api/admin/invites').set('Authorization', `Bearer ${people[who].token}`).send(body);
const preview = (token) =>
  request(server).get('/api/auth/invites/preview').query({ token }).set('X-Forwarded-For', client());
const accept = (token, extra = {}, from = client()) =>
  request(server)
    .post('/api/auth/invites/accept')
    .set('X-Forwarded-For', from)
    .send({ token, fullName: 'Invited Person', password: PASSWORD, ...extra });
const tokenOf = (res) => new URL(res.body.inviteUrl).searchParams.get('token');
let seq = 0;
const freshEmail = () => `invitee${(seq += 1)}-${RUN}@example.test`;

before(async () => {
  if (skip) return;
  require('reflect-metadata');
  const { NestFactory } = require('@nestjs/core');
  const { ValidationPipe } = require('@nestjs/common');
  const { AppModule } = require(join(apiRoot, 'dist/app.module.js'));
  const { AllExceptionsFilter } = require(join(apiRoot, 'dist/common/http/all-exceptions.filter.js'));
  const { configureTrustProxy } = require(join(apiRoot, 'dist/common/http/trust-proxy.js'));
  app = await NestFactory.create(AppModule, { logger: false });
  configureTrustProxy(app, {});
  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));
  await app.init();
  // Listen once on IPv4 loopback (CI-2): supertest otherwise re-listens on a
  // fresh ephemeral port per request, and on a developer machine another
  // local process occasionally answered that port.
  await app.listen(0, '127.0.0.1');
  server = app.getHttpServer();
  request = require('supertest');
  const { PrismaService } = require(join(apiRoot, 'dist/modules/prisma/prisma.service.js'));
  const { MailService } = require(join(apiRoot, 'dist/modules/mail/mail.service.js'));
  prisma = app.get(PrismaService);
  mail = app.get(MailService);

  const hash = await require('bcrypt').hash(PASSWORD, 10);
  const tenant = await prisma.tenant.create({ data: { name: `Tenant ${RUN}`, slug: `tenant-${RUN}`, status: 'ACTIVE' }, select: { id: true } });
  tenantId = tenant.id;
  const other = await prisma.tenant.create({ data: { name: `Other ${RUN}`, slug: `other-${RUN}`, status: 'ACTIVE' }, select: { id: true } });
  otherTenantId = other.id;

  async function member(tid, slug, label, role) {
    const email = `${label}-${RUN}@example.test`;
    const user = await prisma.user.create({ data: { email, displayName: label, passwordHash: hash, status: 'APPROVED' }, select: { id: true } });
    await prisma.tenantMembership.create({ data: { tenantId: tid, userId: user.id, role, status: 'ACTIVE', visibilityScope: 'TENANT_WIDE' } });
    const res = await request(server)
      .post('/api/auth/login')
      .set('X-Forwarded-For', client())
      .send({ email, passwordOrMagicCode: PASSWORD, tenantSlug: slug });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return { id: user.id, email, token: res.body.tokens.accessToken };
  }
  people.owner = await member(tenantId, `tenant-${RUN}`, 'owner', 'OWNER');
  people.manager = await member(tenantId, `tenant-${RUN}`, 'manager', 'MANAGER');
  people.foreign = await member(otherTenantId, `other-${RUN}`, 'foreign', 'OWNER');
});

after(async () => {
  if (app) await app.close();
});

describe('invite flow (MAOS F-2)', { skip }, () => {
  it('only the OWNER of the tenant creates and lists invites', async () => {
    const anon = await request(server).post('/api/admin/invites').send({ email: freshEmail(), role: 'EMPLOYEE' });
    assert.equal(anon.status, 401);
    const byManager = await create('manager', { email: freshEmail(), role: 'EMPLOYEE' });
    assert.equal(byManager.status, 403);
    const listByManager = await request(server).get('/api/admin/invites').set('Authorization', `Bearer ${people.manager.token}`);
    assert.equal(listByManager.status, 403);
  });

  it('refuses OWNER, a CLIENT without a customer, and an email that already has an account', async () => {
    for (const role of ['OWNER', 'CLIENT', 'NOPE']) {
      const res = await create('owner', { email: freshEmail(), role });
      assert.equal(res.status, 400, role);
    }
    const taken = await create('owner', { email: people.manager.email, role: 'EMPLOYEE' });
    assert.equal(taken.status, 409);
    assert.match(JSON.stringify(taken.body), /INVITE_EMAIL_IN_USE/);
    assert.equal(await prisma.invite.count({ where: { tenantId, email: people.manager.email } }), 0);
  });

  it('without email the OWNER gets the link; only the sha256 is stored', async () => {
    const email = freshEmail();
    const res = await create('owner', { email: email.toUpperCase(), role: 'CONTRACTOR' });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.delivery, 'not_sent');
    assert.equal(res.body.invite.email, email, 'email is normalised');
    const token = tokenOf(res);
    assert.match(token, /^[A-Za-z0-9_-]{43}$/);
    const row = await prisma.invite.findUnique({ where: { id: res.body.invite.id } });
    assert.equal(row.status, 'SENT');
    assert.equal(row.tokenHash, createHash('sha256').update(token).digest('hex'));
    assert.ok(row.expiresAt.getTime() - Date.now() > 71 * 3600 * 1000, '72 h lifetime');
    assert.ok(row.expiresAt.getTime() - Date.now() <= 72 * 3600 * 1000);
  });

  it('when the email is sent the token never appears in the response', async () => {
    const original = mail.sendInviteEmail;
    let sentToken = '';
    mail.sendInviteEmail = async (params) => {
      sentToken = params.token;
      return true;
    };
    try {
      const res = await create('owner', { email: freshEmail(), role: 'EMPLOYEE' });
      assert.equal(res.status, 201);
      assert.equal(res.body.delivery, 'emailed');
      assert.equal(res.body.inviteUrl, undefined);
      assert.ok(sentToken.length === 43);
      assert.ok(!JSON.stringify(res.body).includes(sentToken));
    } finally {
      mail.sendInviteEmail = original;
    }
  });

  it('accepting creates an ACTIVE member who can sign in; the token is single-use', async () => {
    const email = freshEmail();
    const token = tokenOf(await create('owner', { email, role: 'EMPLOYEE' }));

    const shown = await preview(token);
    assert.equal(shown.status, 200);
    assert.deepEqual([shown.body.email, shown.body.role, shown.body.tenantName], [email, 'EMPLOYEE', `Tenant ${RUN}`]);

    const ok = await accept(token);
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(ok.body.tenantSlug, `tenant-${RUN}`);

    const user = await prisma.user.findUnique({ where: { email }, include: { memberships: true } });
    assert.equal(user.status, 'APPROVED');
    assert.equal(user.displayName, 'Invited Person');
    assert.deepEqual(
      user.memberships.map((m) => [m.tenantId, m.role, m.status]),
      [[tenantId, 'EMPLOYEE', 'ACTIVE']],
    );
    const invite = await prisma.invite.findFirst({ where: { tenantId, email } });
    assert.equal(invite.status, 'ACCEPTED');
    assert.equal(invite.acceptedByUserId, user.id);
    assert.equal(await prisma.auditEvent.count({ where: { tenantId, resourceId: invite.id, action: 'invite.accepted' } }), 1);

    const login = await request(server)
      .post('/api/auth/login')
      .set('X-Forwarded-For', client())
      .send({ email, passwordOrMagicCode: PASSWORD, tenantSlug: `tenant-${RUN}` });
    assert.equal(login.status, 200);
    assert.equal(login.body.user.role, 'EMPLOYEE');

    for (const res of [await accept(token, { password: 'Another123!' }), await preview(token)]) {
      assert.equal(res.status, 400);
      assert.match(JSON.stringify(res.body), /INVITE_INVALID/);
    }
  });

  it('of concurrent acceptances exactly one wins', async () => {
    const email = freshEmail();
    const token = tokenOf(await create('owner', { email, role: 'MANAGER' }));
    const results = await Promise.all(Array.from({ length: 5 }, () => accept(token)));
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 400, 400, 400, 400]);
    assert.equal(await prisma.user.count({ where: { email } }), 1);
    assert.equal(await prisma.tenantMembership.count({ where: { tenantId, user: { email } } }), 1);
  });

  it('unknown, malformed and expired tokens all get the same answer', async () => {
    const email = freshEmail();
    const res = await create('owner', { email, role: 'EMPLOYEE' });
    const token = tokenOf(res);
    await prisma.invite.update({ where: { id: res.body.invite.id }, data: { expiresAt: new Date(Date.now() - 1000) } });

    const unknown = 'A'.repeat(43);
    for (const t of [token, unknown, 'short', '']) {
      for (const r of [await preview(t), await accept(t)]) {
        assert.equal(r.status, 400, t);
        assert.match(JSON.stringify(r.body), /INVITE_INVALID/);
      }
    }
    assert.equal(await prisma.user.count({ where: { email } }), 0);
    const list = await request(server).get('/api/admin/invites').set('Authorization', `Bearer ${people.owner.token}`);
    assert.equal(list.body.find((i) => i.id === res.body.invite.id).status, 'EXPIRED');
  });

  it('revoked invites and invites replaced by a newer one cannot be accepted', async () => {
    const email = freshEmail();
    const first = await create('owner', { email, role: 'EMPLOYEE' });
    const second = await create('owner', { email, role: 'CONTRACTOR' });
    assert.equal((await accept(tokenOf(first))).status, 400, 'replaced invite is revoked');

    const foreignRevoke = await request(server)
      .post(`/api/admin/invites/${second.body.invite.id}/revoke`)
      .set('Authorization', `Bearer ${people.foreign.token}`);
    assert.equal(foreignRevoke.status, 404, 'another tenant cannot touch it');
    const foreignList = await request(server).get('/api/admin/invites').set('Authorization', `Bearer ${people.foreign.token}`);
    assert.equal(foreignList.status, 200);
    assert.ok(!foreignList.body.some((i) => i.email === email));

    const revoke = (who) =>
      request(server).post(`/api/admin/invites/${second.body.invite.id}/revoke`).set('Authorization', `Bearer ${people[who].token}`);
    assert.equal((await revoke('manager')).status, 403);
    assert.equal((await revoke('owner')).status, 200);
    assert.equal((await revoke('owner')).status, 404, 'revoking twice');
    assert.equal((await accept(tokenOf(second))).status, 400);
    assert.equal(await prisma.user.count({ where: { email } }), 0);
  });

  it('an invite revoked while an acceptance is in flight is not accepted', async () => {
    // Deterministic race: the test holds the invite row lock, so the
    // acceptance passes its first check and then waits on the claim; the
    // revoke commits first and the claim must see it.
    const email = freshEmail();
    const res = await create('owner', { email, role: 'EMPLOYEE' });
    let pending;
    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT 1 FROM "Invite" WHERE id = ${res.body.invite.id} FOR UPDATE`;
        pending = accept(tokenOf(res)).then((r) => r);
        for (let i = 0; i < 100; i += 1) {
          const [{ waiting }] = await prisma.$queryRaw`SELECT count(*)::int AS waiting FROM pg_locks WHERE NOT granted`;
          if (waiting > 0) break;
          await new Promise((r) => setTimeout(r, 50));
        }
        await tx.invite.update({ where: { id: res.body.invite.id }, data: { status: 'REVOKED', revokedAt: new Date() } });
      },
      { timeout: 15000 },
    );
    const outcome = await pending;
    assert.equal(outcome.status, 400, JSON.stringify(outcome.body));
    assert.equal(await prisma.user.count({ where: { email } }), 0);
    assert.equal((await prisma.invite.findUnique({ where: { id: res.body.invite.id } })).status, 'REVOKED');
  });

  it('an invite into a suspended tenant cannot be accepted', async () => {
    const email = freshEmail();
    const res = await create('foreign', { email, role: 'EMPLOYEE' });
    const token = tokenOf(res);
    await prisma.tenant.update({ where: { id: otherTenantId }, data: { status: 'SUSPENDED' } });
    try {
      assert.equal((await accept(token)).status, 400);
      assert.equal(await prisma.user.count({ where: { email } }), 0);
    } finally {
      await prisma.tenant.update({ where: { id: otherTenantId }, data: { status: 'ACTIVE' } });
    }
  });

  it('an email that registered after the invite was sent is not taken over', async () => {
    const email = freshEmail();
    const token = tokenOf(await create('owner', { email, role: 'MANAGER' }));
    const squatter = await prisma.user.create({ data: { email, status: 'PENDING_APPROVAL', passwordHash: 'x' }, select: { id: true } });
    assert.equal((await accept(token)).status, 400);
    const after = await prisma.user.findUnique({ where: { id: squatter.id }, include: { memberships: true } });
    assert.equal(after.passwordHash, 'x');
    assert.equal(after.memberships.length, 0);
    assert.equal((await prisma.invite.findFirst({ where: { tenantId, email } })).status, 'SENT', 'rolled back');
  });

  it('CLIENT invites need an explicit, active customer of this tenant; other roles cannot name one', async () => {
    const mk = (tenant, key, status = 'ACTIVE') =>
      prisma.customer.create({ data: { tenantId: tenant, clientScopeKey: `${key}-${RUN}`, name: key, status } });
    const own = await mk(tenantId, 'own');
    const archived = await mk(tenantId, 'arch', 'ARCHIVED');
    const foreign = await mk(otherTenantId, 'own');
    for (const [customerId, why] of [[undefined, 'missing'], ['nope', 'unknown'], [archived.id, 'archived'], [foreign.id, 'other tenant']]) {
      const res = await create('owner', { email: freshEmail(), role: 'CLIENT', ...(customerId ? { customerId } : {}) });
      assert.equal(res.status, 400, why);
      assert.match(JSON.stringify(res.body), /INVITE_CUSTOMER_REQUIRED/, why);
    }
    const wrongRole = await create('owner', { email: freshEmail(), role: 'EMPLOYEE', customerId: own.id });
    assert.equal(wrongRole.status, 400);
    assert.match(JSON.stringify(wrongRole.body), /INVITE_CUSTOMER_NOT_ALLOWED/);
    assert.equal((await create('manager', { email: freshEmail(), role: 'CLIENT', customerId: own.id })).status, 403);
  });

  it('accepting a CLIENT invite gives a CLIENT membership scoped to that customer only', async () => {
    const customer = await prisma.customer.create({ data: { tenantId, clientScopeKey: `acc-${RUN}`, name: 'Acme Client Co' } });
    const email = freshEmail();
    const res = await create('owner', { email, role: 'CLIENT', customerId: customer.id });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.invite.customer.name, 'Acme Client Co');
    const token = tokenOf(res);
    const shown = await preview(token);
    assert.deepEqual([shown.body.role, shown.body.customerName], ['CLIENT', 'Acme Client Co']);
    assert.equal((await accept(token)).status, 200);
    const m = await prisma.tenantMembership.findFirst({ where: { tenantId, user: { email } } });
    assert.deepEqual([m.role, m.status, m.clientScopeKey], ['CLIENT', 'ACTIVE', `acc-${RUN}`]);
  });

  it('a CLIENT invite whose customer was archived after sending cannot be accepted', async () => {
    const customer = await prisma.customer.create({ data: { tenantId, clientScopeKey: `late-${RUN}`, name: 'Late' } });
    const email = freshEmail();
    const token = tokenOf(await create('owner', { email, role: 'CLIENT', customerId: customer.id }));
    await prisma.customer.update({ where: { id: customer.id }, data: { status: 'ARCHIVED' } });
    const res = await accept(token);
    assert.equal(res.status, 400);
    assert.match(JSON.stringify(res.body), /INVITE_INVALID/);
    assert.equal(await prisma.user.count({ where: { email } }), 0);
    assert.equal((await prisma.invite.findFirst({ where: { tenantId, email } })).status, 'SENT', 'rolled back');
  });

  it('acceptance is throttled per client', async () => {
    const from = '203.0.113.77';
    const statuses = [];
    for (let i = 0; i < 6; i += 1) statuses.push((await accept('B'.repeat(43), {}, from)).status);
    assert.deepEqual(statuses, [400, 400, 400, 400, 400, 429]);
  });
});
