/**
 * Security gate - role transitions and permission revocation (MAOS E03).
 *
 * Fills the gaps around the #126 fixes (security-gate-member-management,
 * security-gate-explicit-grants, company-access-isolation): the privileges a
 * role change or a grant revocation must take away, what the new role keeps,
 * that company B never moves when company A changes, that a token issued
 * before the change (and its refresh) cannot exercise revoked privileges,
 * that a refused change leaves the database untouched, that every change is
 * audited exactly once, and that the last Owner stays protected.
 * Real Nest HTTP + isolated test database with fictional users and two
 * companies. Run with MAOS_INTEGRATION=1, DATABASE_URL and JWT_SECRET, after
 * migrations. Requires a TEST database only; never point this suite at production.
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
const RUN = 'rt' + Date.now().toString(36);
const PASSWORD = 'RoleTransitionTest123!';

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
const grant = (token, userId, key, enabled) => call(token, 'patch', `/api/auth/company-members/${userId}/grants/${key}`, { enabled });
const rows = (membershipId) => prisma.membershipPermission.findMany({ where: { membershipId }, orderBy: [{ action: 'asc' }, { resource: 'asc' }], select: { action: true, resource: true, granted: true } });
const membership = (id) => prisma.tenantMembership.findUnique({ where: { id }, select: { role: true, status: true, clientScopeKey: true, visibilityScope: true } });
const audits = (tenantId, action, resourceId) => prisma.auditEvent.count({ where: { tenantId, action, resourceId } });
const memberView = async (token, userId) => (await call(token, 'get', '/api/auth/company-members')).body.find((m) => m.userId === userId);
const approval = (tenant, title) => prisma.approvalRequest.create({ data: { tenantId: tenant.id, title: `${title} ${RUN}`, status: 'REQUESTED' } });
const decide = (token, id) => call(token, 'post', `/api/approvals/${id}/decision`, { decision: 'APPROVE' });

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

  for (const k of ['a', 'b', 'solo']) co[k] = await prisma.tenant.create({ data: { name: `RT ${k} ${RUN}`, slug: `${RUN}-${k}`, status: 'ACTIVE' } });
  p.owner = await member(co.a, 'OWNER', 'owner');
  p.ownerB = await member(co.b, 'OWNER', 'ownerb');
  p.soloOwner = await member(co.solo, 'OWNER', 'solo');
  p.manager = await member(co.a, 'MANAGER', 'manager');      // E03-01: manager -> client
  p.employee = await member(co.a, 'EMPLOYEE', 'employee');   // E03-02/03: employee -> manager -> employee; all-tasks
  p.dual = await member(co.a, 'EMPLOYEE', 'dual');           // E03-04: employee in A, manager in B
  p.dualB = await member(co.b, 'MANAGER', '', p.dual.id);
  p.plain = await member(co.a, 'MANAGER', 'plain');          // E03-07/09: refused changes leave it untouched

  rec.customerA = await prisma.customer.create({ data: { tenantId: co.a.id, name: `Customer A ${RUN}`, clientScopeKey: `cust-a-${RUN}`, status: 'ACTIVE' } });
  rec.customerB = await prisma.customer.create({ data: { tenantId: co.b.id, name: `Customer B ${RUN}`, clientScopeKey: `cust-b-${RUN}`, status: 'ACTIVE' } });
  rec.invoiceA = await prisma.invoice.create({ data: { tenantId: co.a.id, invoiceNumber: `RT-A-${RUN}`, currency: 'EUR', totalCents: 1000, status: 'SENT' } });
  rec.invoiceB = await prisma.invoice.create({ data: { tenantId: co.b.id, invoiceNumber: `RT-B-${RUN}`, currency: 'EUR', totalCents: 2000, status: 'SENT' } });
  rec.project = await prisma.project.create({ data: { tenantId: co.a.id, name: `Project ${RUN}`, status: 'ACTIVE' } });
  rec.unassigned = await prisma.task.create({ data: { tenantId: co.a.id, projectId: rec.project.id, title: `Not assigned ${RUN}` } });
  rec.own = await prisma.task.create({ data: { tenantId: co.a.id, projectId: rec.project.id, title: `Own ${RUN}`, assignedToUserId: p.employee.id } });

  for (const k of ['owner', 'ownerB', 'soloOwner', 'manager', 'employee', 'dual', 'plain']) {
    p[k + 'Tokens'] = await login(p[k], k === 'ownerB' ? co.b : k === 'soloOwner' ? co.solo : co.a);
    p[k + 'Token'] = p[k + 'Tokens'].accessToken;
  }
  p.dualBToken = (await login(p.dual, co.b)).accessToken;
});
after(async () => { if (app) await app.close(); });

describe('E03-01 Manager to Client: finance and approval privileges end, client-portal access remains', { skip }, () => {
  it('loses invoices and approvals on the same token, keeps only the client portal', async () => {
    assert.equal((await grant(p.ownerToken, p.manager.id, 'invoices-read', true)).status, 200);
    assert.equal((await grant(p.ownerToken, p.manager.id, 'decide-approvals', true)).status, 200);
    const a1 = await approval(co.a, 'A1');
    assert.equal((await call(p.managerToken, 'get', '/api/invoices')).status, 200, 'baseline: reads invoices');
    assert.equal((await decide(p.managerToken, a1.id)).status, 201, 'baseline: decides approvals');
    assert.equal((await call(p.managerToken, 'get', '/api/leads')).status, 200, 'baseline: manager route');
    const roleEvents = await audits(co.a.id, 'role.changed', p.manager.id);

    const res = await changeRole(p.ownerToken, p.manager.id, { role: 'CLIENT', customerId: rec.customerA.id });
    assert.equal(res.status, 200, JSON.stringify(res.body));

    const a2 = await approval(co.a, 'A2');
    assert.equal((await call(p.managerToken, 'get', '/api/invoices')).status, 403, 'invoice list refused');
    assert.equal((await call(p.managerToken, 'get', `/api/invoices/${rec.invoiceA.id}`)).status, 403, 'invoice by id refused');
    assert.equal((await decide(p.managerToken, a2.id)).status, 403, 'approval decision refused');
    assert.equal((await call(p.managerToken, 'get', '/api/leads')).status, 403, 'manager route refused');
    assert.equal((await call(p.managerToken, 'get', '/api/auth/company-members')).status, 403, 'member list refused');
    assert.equal((await call(p.managerToken, 'get', '/api/client/projects')).status, 200, 'client portal opens for the customer scope');

    assert.deepEqual(await membership(p.manager.membershipId), { role: 'CLIENT', status: 'ACTIVE', clientScopeKey: `cust-a-${RUN}`, visibilityScope: 'CLIENT_LEVEL' });
    assert.deepEqual((await rows(p.manager.membershipId)).filter((r) => r.action !== 'switch'), [], 'no grant row survives');
    assert.equal(await audits(co.a.id, 'role.changed', p.manager.id), roleEvents + 1, 'exactly one audit event');
  });

  it('E03-05 a refresh of the old session yields a token with the new role only', async () => {
    const res = await request(server).post('/api/auth/refresh').send({ refreshToken: p.managerTokens.refreshToken });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const fresh = res.body.accessToken;
    const claims = JSON.parse(Buffer.from(fresh.split('.')[1], 'base64url').toString());
    assert.equal(claims.role, 'CLIENT', 'the refreshed token carries the new role');
    assert.ok(fresh, 'refresh returns an access token');
    assert.equal((await call(fresh, 'get', '/api/invoices')).status, 403);
    assert.equal((await call(fresh, 'get', '/api/leads')).status, 403);
    assert.equal((await call(fresh, 'get', '/api/client/projects')).status, 200);
  });
});

describe('E03-02 Employee to Manager: old grants go, the new role applies, nothing returns', { skip }, () => {
  it('drops all-tasks and decide-approvals, gains manager routes, and a change back restores nothing', async () => {
    assert.equal((await grant(p.ownerToken, p.employee.id, 'all-tasks', true)).status, 200);
    assert.equal((await grant(p.ownerToken, p.employee.id, 'decide-approvals', true)).status, 200);
    assert.equal((await call(p.employeeToken, 'get', `/api/tasks/${rec.unassigned.id}`)).status, 200, 'baseline: sees every task');
    assert.equal((await call(p.employeeToken, 'get', '/api/leads')).status, 403, 'baseline: no manager route');
    const before = await rows(p.employee.membershipId);
    assert.ok(before.length >= 2, 'grant rows exist');

    assert.equal((await changeRole(p.ownerToken, p.employee.id, { role: 'MANAGER' })).status, 200);
    assert.deepEqual((await rows(p.employee.membershipId)).filter((r) => r.action !== 'switch'), [], 'old grants removed');
    assert.equal((await call(p.employeeToken, 'get', '/api/leads')).status, 200, 'manager route opens on the same token');
    const a3 = await approval(co.a, 'A3');
    assert.equal((await decide(p.employeeToken, a3.id)).status, 403, 'a manager still needs the approver grant');
    const view = await memberView(p.ownerToken, p.employee.id);
    assert.equal(view.role, 'MANAGER');
    assert.equal(view.grants['decide-approvals'], false);
    assert.equal(view.grants['all-tasks'], undefined, 'all-tasks is not a manager grant');

    // E03-06: back to EMPLOYEE, the earlier grants do not come back.
    assert.equal((await changeRole(p.ownerToken, p.employee.id, { role: 'EMPLOYEE' })).status, 200);
    const again = await memberView(p.ownerToken, p.employee.id);
    assert.equal(again.grants['all-tasks'], false);
    assert.equal(again.grants['decide-approvals'], false);
    assert.equal((await call(p.employeeToken, 'get', `/api/tasks/${rec.unassigned.id}`)).status, 404, 'unassigned task hidden again');
    assert.equal((await call(p.employeeToken, 'get', `/api/tasks/${rec.own.id}`)).status, 200, 'own task stays');
    assert.equal((await call(p.employeeToken, 'get', '/api/leads')).status, 403, 'manager route closed again');
  });
});

describe('E03-03 Revoking "Sees all tasks" through the owner endpoint', { skip }, () => {
  it('hides the other tasks from the list and from direct id access, and is audited once per change', async () => {
    const events = await audits(co.a.id, 'membership.grant_updated', p.employee.membershipId);
    assert.equal((await grant(p.ownerToken, p.employee.id, 'all-tasks', true)).status, 200);
    const withGrant = (await call(p.employeeToken, 'get', '/api/tasks')).body;
    assert.ok(JSON.stringify(withGrant).includes(`Not assigned ${RUN}`), 'list shows the unassigned task');
    assert.equal((await call(p.employeeToken, 'get', `/api/tasks/${rec.unassigned.id}`)).status, 200, 'direct id opens');

    assert.equal((await grant(p.ownerToken, p.employee.id, 'all-tasks', false)).status, 200);
    const without = (await call(p.employeeToken, 'get', '/api/tasks')).body;
    assert.ok(!JSON.stringify(without).includes(`Not assigned ${RUN}`), 'list hides the unassigned task');
    assert.ok(JSON.stringify(without).includes(`Own ${RUN}`), 'own task still listed');
    assert.equal((await call(p.employeeToken, 'get', `/api/tasks/${rec.unassigned.id}`)).status, 404, 'direct id refused as not found');
    assert.equal((await memberView(p.ownerToken, p.employee.id)).grants['all-tasks'], false, 'the UI reads it as off');
    assert.equal(await audits(co.a.id, 'membership.grant_updated', p.employee.membershipId), events + 2, 'one event per change, no duplicates');
  });
});

describe('E03-04 A role change in company A never touches company B', { skip }, () => {
  it('keeps the B role, the B grant and the B session as they were', async () => {
    assert.equal((await call(p.ownerBToken, 'patch', `/api/auth/company-members/${p.dual.id}/grants/invoices-read`, { enabled: true })).status, 200);
    assert.equal((await call(p.dualBToken, 'get', '/api/invoices')).status, 200, 'baseline: manager in B reads invoices');
    const bBefore = { m: await membership(p.dualB.membershipId), rows: await rows(p.dualB.membershipId) };

    assert.equal((await changeRole(p.ownerToken, p.dual.id, { role: 'CONTRACTOR' })).status, 200);
    assert.equal((await membership(p.dual.membershipId)).role, 'CONTRACTOR', 'A changed');
    assert.deepEqual({ m: await membership(p.dualB.membershipId), rows: await rows(p.dualB.membershipId) }, bBefore, 'B unchanged');
    assert.equal((await call(p.dualBToken, 'get', '/api/invoices')).status, 200, 'B session still reads B invoices');
    assert.equal((await call(p.dualBToken, 'get', `/api/invoices/${rec.invoiceA.id}`)).status, 404, 'A invoice never through B');
    assert.equal(await audits(co.b.id, 'role.changed', p.dual.id), 0, 'no audit event in B');
    assert.equal(await audits(co.a.id, 'role.changed', p.dual.id), 1, 'one audit event in A');
  });
});

describe('E03-07 / E03-09 Unauthorized or invalid changes are refused and change nothing', { skip }, () => {
  const snapshot = async () => ({ m: await membership(p.plain.membershipId), rows: await rows(p.plain.membershipId), events: await audits(co.a.id, 'role.changed', p.plain.id) });

  it('only the OWNER of this company changes roles or grants', async () => {
    assert.equal((await grant(p.ownerToken, p.plain.id, 'invoices-read', true)).status, 200);
    const before = await snapshot();
    assert.equal((await changeRole(p.employeeToken, p.plain.id, { role: 'EMPLOYEE' })).status, 403, 'employee');
    assert.equal((await changeRole(p.plainToken, p.plain.id, { role: 'EMPLOYEE' })).status, 403, 'the manager themself');
    assert.equal((await changeRole(p.ownerBToken, p.plain.id, { role: 'EMPLOYEE' })).status, 403, 'owner of another company');
    assert.equal((await grant(p.plainToken, p.plain.id, 'invoices-edit', true)).status, 403, 'self-grant');
    assert.equal((await grant(p.ownerBToken, p.plain.id, 'invoices-edit', true)).status, 403, 'grant from another company');
    assert.deepEqual(await snapshot(), before, 'nothing changed');
  });

  it('an invalid role, a foreign customer or a missing customer are refused before anything is written', async () => {
    const before = await snapshot();
    assert.equal((await changeRole(p.ownerToken, p.plain.id, { role: 'OWNER' })).status, 400, 'nobody becomes Owner here');
    assert.equal((await changeRole(p.ownerToken, p.plain.id, { role: 'SUPERUSER' })).status, 400, 'unknown role');
    assert.equal((await changeRole(p.ownerToken, p.plain.id, { role: 'CLIENT', customerId: rec.customerB.id })).status, 400, 'customer of company B');
    assert.equal((await changeRole(p.ownerToken, p.plain.id, { role: 'CLIENT' })).status, 400, 'client without a customer');
    assert.equal((await changeRole(p.ownerToken, p.plain.id, { role: 'EMPLOYEE', customerId: rec.customerA.id })).status, 400, 'customer for a non-client role');
    assert.deepEqual(await snapshot(), before, 'role, grants and audit untouched');
    assert.equal((await call(p.plainToken, 'get', '/api/invoices')).status, 200, 'the kept grant still works');
  });
});

describe('E03-10 The last Owner stays protected', { skip }, () => {
  it('cannot be changed, removed or suspended, even by themself, and keeps working', async () => {
    assert.equal((await changeRole(p.soloOwnerToken, p.soloOwner.id, { role: 'MANAGER' })).status, 403, 'role change');
    assert.equal((await call(p.soloOwnerToken, 'post', `/api/auth/company-members/${p.soloOwner.id}/remove`)).status, 403, 'remove');
    assert.equal((await call(p.soloOwnerToken, 'post', `/api/admin/users/${p.soloOwner.id}/suspend`)).status, 403, 'suspend');
    assert.equal((await changeRole(p.ownerToken, p.owner.id, { role: 'MANAGER' })).status, 403, 'an Owner of a company with two Owners is not changed either');
    assert.deepEqual(await membership(p.soloOwner.membershipId), { role: 'OWNER', status: 'ACTIVE', clientScopeKey: null, visibilityScope: 'TENANT_WIDE' });
    assert.equal((await call(p.soloOwnerToken, 'get', '/api/auth/company-members')).status, 200, 'still the Owner');
  });
});
