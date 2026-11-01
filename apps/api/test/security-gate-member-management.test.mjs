/**
 * Member management (owner decision 2026-11-01): the OWNER changes roles,
 * removes members from one company and revokes invitations. A role change
 * never carries the old role's permissions over, a removed member loses the
 * company at once but keeps the account, and Owners are never changed here.
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
const RUN = 'mm' + Date.now().toString(36);
const PASSWORD = 'MemberManagementTest123!';

let app, server, request, prisma;
const co = {};
const p = {};
const rec = {};

async function member(tenant, role, label, existingUserId) {
  const bcrypt = require('bcrypt');
  const user = existingUserId
    ? await prisma.user.findUnique({ where: { id: existingUserId } })
    : await prisma.user.create({
      data: { email: `${label}-${RUN}@example.test`, displayName: `${label} ${RUN}`, passwordHash: await bcrypt.hash(PASSWORD, 10), status: 'APPROVED' },
    });
  const m = await prisma.tenantMembership.create({ data: { tenantId: tenant.id, userId: user.id, role, status: 'ACTIVE' } });
  return { id: user.id, email: user.email, membershipId: m.id };
}
async function login(person, tenant) {
  const res = await request(server).post('/api/auth/login').send({ email: person.email, passwordOrMagicCode: PASSWORD, tenantSlug: tenant.slug });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.tokens;
}
const call = (token, method, path, body) => {
  const req = request(server)[method](path).set('Authorization', `Bearer ${token}`);
  return body ? req.send(body) : req;
};
const changeRole = (token, userId, body) => call(token, 'patch', `/api/admin/users/${userId}/role`, body);
const remove = (token, userId) => call(token, 'post', `/api/auth/company-members/${userId}/remove`);
const grant = (token, userId, key, enabled) => call(token, 'patch', `/api/auth/company-members/${userId}/grants/${key}`, { enabled });
const rows = (membershipId) => prisma.membershipPermission.findMany({ where: { membershipId }, select: { action: true, resource: true, granted: true } });

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
  await app.listen(0, '127.0.0.1');
  server = app.getHttpServer();
  request = require('supertest');
  const { PrismaService } = require(join(apiRoot, 'dist/modules/prisma/prisma.service.js'));
  prisma = app.get(PrismaService);

  for (const k of ['a', 'b']) co[k] = await prisma.tenant.create({ data: { name: `MM ${k} ${RUN}`, slug: `${RUN}-${k}`, status: 'ACTIVE' } });
  p.owner = await member(co.a, 'OWNER', 'owner');
  p.owner2 = await member(co.a, 'OWNER', 'owner2');
  p.ownerB = await member(co.b, 'OWNER', 'ownerb');
  p.manager = await member(co.a, 'MANAGER', 'manager');
  p.employee = await member(co.a, 'EMPLOYEE', 'employee');
  p.contractor = await member(co.a, 'CONTRACTOR', 'contractor');
  p.client = await member(co.a, 'CLIENT', 'client');
  await prisma.tenantMembership.update({ where: { id: p.client.membershipId }, data: { clientScopeKey: `client-${RUN}` } });
  // Works in both companies; removed from A later, keeps B.
  p.leaver = await member(co.a, 'EMPLOYEE', 'leaver');
  await member(co.b, 'EMPLOYEE', '', p.leaver.id);

  rec.customerA = await prisma.customer.create({ data: { tenantId: co.a.id, name: `Customer A ${RUN}`, clientScopeKey: `cust-a-${RUN}`, status: 'ACTIVE' } });
  rec.customerB = await prisma.customer.create({ data: { tenantId: co.b.id, name: `Customer B ${RUN}`, clientScopeKey: `cust-b-${RUN}`, status: 'ACTIVE' } });
  rec.invoiceA = await prisma.invoice.create({ data: { tenantId: co.a.id, invoiceNumber: `MM-A-${RUN}`, currency: 'EUR', totalCents: 1000, status: 'SENT' } });
  const project = await prisma.project.create({ data: { tenantId: co.a.id, name: `Project ${RUN}`, status: 'ACTIVE' } });
  await prisma.task.create({ data: { tenantId: co.a.id, projectId: project.id, title: `Not assigned ${RUN}` } });

  for (const k of ['owner', 'ownerB', 'manager', 'employee', 'contractor', 'client']) {
    p[k + 'Token'] = (await login(p[k], k === 'ownerB' ? co.b : co.a)).accessToken;
  }
});
after(async () => { if (app) await app.close(); });

describe('Role change: the old role\'s permissions never carry over', { skip }, () => {
  it('a manager with invoice access changed to client loses it (regression)', async () => {
    assert.equal((await grant(p.ownerToken, p.manager.id, 'invoices-read', true)).status, 200);
    await call(p.ownerToken, 'patch', `/api/auth/company-members/${p.manager.id}/switch`, { enabled: false });
    assert.equal((await call(p.managerToken, 'get', '/api/invoices')).status, 200, 'manager reads invoices with the grant');

    const res = await changeRole(p.ownerToken, p.manager.id, { role: 'CLIENT', customerId: rec.customerA.id });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal((await call(p.managerToken, 'get', '/api/invoices')).status, 403, 'list refused after the change');
    assert.equal((await call(p.managerToken, 'get', `/api/invoices/${rec.invoiceA.id}`)).status, 403, 'detail refused after the change');

    const membership = await prisma.tenantMembership.findUnique({ where: { id: p.manager.membershipId } });
    assert.equal(membership.role, 'CLIENT');
    assert.equal(membership.clientScopeKey, `cust-a-${RUN}`, 'client scope from the chosen customer');
    assert.equal(membership.visibilityScope, 'CLIENT_LEVEL');
    assert.deepEqual(await rows(p.manager.membershipId), [{ action: 'switch', resource: 'tenant', granted: false }],
      'only the company-switch setting stays');
    const event = await prisma.auditEvent.findFirst({
      where: { tenantId: co.a.id, action: 'role.changed', resourceId: p.manager.id }, orderBy: { createdAt: 'desc' },
    });
    assert.equal(event?.redactedPayload?.previousRole, 'MANAGER');
    assert.ok(event?.redactedPayload?.permissionsCleared >= 2, 'audit records the cleared permissions');
  });

  it('a stale grant row left from another role never opens a route', async () => {
    // Rows written before this fix (or by hand) are ignored for roles they were never for.
    for (const who of ['contractor', 'employee', 'client']) {
      await prisma.membershipPermission.create({
        data: { membershipId: p[who].membershipId, action: 'read', resource: 'invoice', granted: true },
      });
      assert.equal((await call(p[who + 'Token'], 'get', '/api/invoices')).status, 403, who);
      await prisma.membershipPermission.deleteMany({ where: { membershipId: p[who].membershipId, resource: 'invoice' } });
    }
  });

  it('an employee who sees all tasks keeps nothing of it as a contractor', async () => {
    assert.equal((await grant(p.ownerToken, p.employee.id, 'all-tasks', true)).status, 200);
    const allTasks = (await call(p.employeeToken, 'get', '/api/tasks')).body;
    assert.ok(JSON.stringify(allTasks).includes(`Not assigned ${RUN}`), 'all tasks visible with the grant');
    assert.equal((await changeRole(p.ownerToken, p.employee.id, { role: 'CONTRACTOR' })).status, 200);
    const scoped = await call(p.employeeToken, 'get', '/api/tasks');
    assert.ok(!JSON.stringify(scoped.body).includes(`Not assigned ${RUN}`), 'unassigned task hidden after the change');
    assert.equal((await rows(p.employee.membershipId)).length, 0);
    assert.equal((await changeRole(p.ownerToken, p.employee.id, { role: 'EMPLOYEE' })).status, 200);
    const back = (await call(p.ownerToken, 'get', '/api/auth/company-members')).body.find((m) => m.userId === p.employee.id);
    assert.equal(back.grants['all-tasks'], false, 'switching back does not restore the old grant');
  });
});

describe('Role change: who and what', { skip }, () => {
  it('only an OWNER of the company changes roles', async () => {
    for (const who of ['manager', 'employee', 'contractor', 'client']) {
      assert.equal((await changeRole(p[who + 'Token'], p.contractor.id, { role: 'EMPLOYEE' })).status, 403, who);
    }
    assert.equal((await changeRole(p.ownerBToken, p.contractor.id, { role: 'EMPLOYEE' })).status, 403, 'owner of another company');
  });

  it('Owners are never changed and nobody becomes Owner here', async () => {
    assert.equal((await changeRole(p.ownerToken, p.owner.id, { role: 'MANAGER' })).status, 403, 'self');
    assert.equal((await changeRole(p.ownerToken, p.owner2.id, { role: 'MANAGER' })).status, 403, 'other owner');
    assert.equal((await changeRole(p.ownerToken, p.contractor.id, { role: 'OWNER' })).status, 400);
  });

  it('a client needs an active customer of this company', async () => {
    assert.equal((await changeRole(p.ownerToken, p.contractor.id, { role: 'CLIENT' })).status, 400);
    assert.equal((await changeRole(p.ownerToken, p.contractor.id, { role: 'CLIENT', customerId: rec.customerB.id })).status, 400, 'customer of company B');
    assert.equal((await changeRole(p.ownerToken, p.contractor.id, { role: 'EMPLOYEE', customerId: rec.customerA.id })).status, 400);
    assert.equal((await prisma.tenantMembership.findUnique({ where: { id: p.contractor.membershipId } })).role, 'CONTRACTOR');
  });
});

describe('Remove from company', { skip }, () => {
  it('only an OWNER of the company removes, never an Owner', async () => {
    for (const who of ['manager', 'employee', 'contractor', 'client']) {
      assert.equal((await remove(p[who + 'Token'], p.leaver.id)).status, 403, who);
    }
    assert.equal((await remove(p.ownerBToken, p.contractor.id)).status, 404, 'not a member of B');
    assert.equal((await remove(p.ownerToken, p.owner.id)).status, 403, 'self');
    assert.equal((await remove(p.ownerToken, p.owner2.id)).status, 403, 'other owner');
    assert.equal((await remove(p.ownerToken, p.ownerB.id)).status, 404, 'owner of another company');
  });

  it('access to the company ends at once; the account and other companies stay', async () => {
    const tokensA = await login(p.leaver, co.a);
    const tokensB = rec.leaverB = await login(p.leaver, co.b);
    await grant(p.ownerToken, p.leaver.id, 'all-tasks', true);
    assert.equal((await call(tokensA.accessToken, 'get', '/api/tasks')).status, 200);

    const res = await remove(p.ownerToken, p.leaver.id);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal((await call(tokensA.accessToken, 'get', '/api/tasks')).status, 401, 'access token of A refused');
    assert.equal((await request(server).post('/api/auth/refresh').send({ refreshToken: tokensA.refreshToken })).status, 401, 'refresh of A refused');
    const relogin = await request(server).post('/api/auth/login').send({ email: p.leaver.email, passwordOrMagicCode: PASSWORD, tenantSlug: co.a.slug });
    assert.notEqual(relogin.status, 200, 'cannot sign in to A');

    assert.equal((await call(tokensB.accessToken, 'get', '/api/tasks')).status, 200, 'company B unaffected');
    assert.equal((await prisma.user.findUnique({ where: { id: p.leaver.id } })).status, 'APPROVED', 'account kept');
    const m = await prisma.tenantMembership.findUnique({ where: { tenantId_userId: { tenantId: co.a.id, userId: p.leaver.id } } });
    assert.equal(m.status, 'REMOVED');
    assert.equal((await rows(m.id)).length, 0, 'permissions in A deleted');

    const event = await prisma.auditEvent.findFirst({ where: { tenantId: co.a.id, action: 'membership.removed', resourceId: m.id } });
    assert.ok(event, 'audit event missing');
    assert.equal(event.redactedPayload?.role, 'EMPLOYEE');

    assert.equal((await remove(p.ownerToken, p.leaver.id)).status, 404, 'already removed');
    assert.equal((await grant(p.ownerToken, p.leaver.id, 'all-tasks', true)).status, 403, 'no grants for a removed member');
    assert.equal((await changeRole(p.ownerToken, p.leaver.id, { role: 'MANAGER' })).status, 403, 'no role change for a removed member');
  });

  it('a removed member can be invited back and starts clean', async () => {
    const inv = await call(p.ownerToken, 'post', '/api/admin/invites', { email: p.leaver.email, role: 'CONTRACTOR' });
    assert.equal(inv.status, 201, JSON.stringify(inv.body));
    const token = new URL(inv.body.inviteUrl).searchParams.get('token');
    const ok = await call(rec.leaverB.accessToken, 'post', '/api/auth/invites/accept-existing', { token });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    const m = await prisma.tenantMembership.findUnique({ where: { tenantId_userId: { tenantId: co.a.id, userId: p.leaver.id } } });
    assert.equal(m.status, 'ACTIVE');
    assert.equal(m.role, 'CONTRACTOR');
    assert.equal((await rows(m.id)).length, 0);
    assert.equal((await call(p.ownerToken, 'post', '/api/admin/invites', { email: p.contractor.email, role: 'EMPLOYEE' })).status, 409, 'active members are still not re-invited');
  });
});

describe('Revoke invitation', { skip }, () => {
  it('only the OWNER of the company, once, and recorded', async () => {
    const inv = await call(p.ownerToken, 'post', '/api/admin/invites', { email: `new-${RUN}@example.test`, role: 'EMPLOYEE' });
    assert.equal(inv.status, 201);
    const id = inv.body.invite.id;
    for (const who of ['manager', 'employee', 'contractor', 'client']) {
      assert.equal((await call(p[who + 'Token'], 'post', `/api/admin/invites/${id}/revoke`)).status, 403, who);
    }
    assert.equal((await call(p.ownerBToken, 'post', `/api/admin/invites/${id}/revoke`)).status, 404, 'other company');
    assert.equal((await call(p.ownerToken, 'post', `/api/admin/invites/${id}/revoke`)).status, 200);
    assert.equal((await call(p.ownerToken, 'post', `/api/admin/invites/${id}/revoke`)).status, 404, 'already revoked');
    const listed = (await call(p.ownerToken, 'get', '/api/admin/invites')).body.find((i) => i.id === id);
    assert.equal(listed.status, 'REVOKED');
    const token = new URL(inv.body.inviteUrl).searchParams.get('token');
    assert.notEqual((await request(server).get('/api/auth/invites/preview').query({ token })).status, 200, 'revoked link is dead');
    assert.ok(await prisma.auditEvent.findFirst({ where: { tenantId: co.a.id, action: 'invite.revoked', resourceId: id } }));
  });
});

describe('Member list', { skip }, () => {
  it('only the OWNER lists the company\'s members, with their status', async () => {
    for (const who of ['manager', 'employee', 'contractor', 'client']) {
      assert.equal((await call(p[who + 'Token'], 'get', '/api/auth/company-members')).status, 403, who);
    }
    const list = (await call(p.ownerToken, 'get', '/api/auth/company-members')).body;
    assert.ok(list.every((m) => m.email.endsWith(`${RUN}@example.test`) && m.userId !== p.ownerB.id), 'company A only');
    assert.ok(list.some((m) => m.status === 'ACTIVE'));
  });
});
