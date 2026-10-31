/**
 * Explicit per-company grants (owner decision 2026-10-31): only the OWNER and
 * members made approvers decide approvals, managers see invoices only with
 * the invoices grant, employees see assigned tasks unless granted all tasks,
 * and a contractor sees only their chat channels and their own notifications.
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
const RUN = 'eg' + Date.now().toString(36);
const PASSWORD = 'ExplicitGrantsTest123!';

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
  return res.body.tokens.accessToken;
}
const call = (token, method, path, body) => {
  const req = request(server)[method](path).set('Authorization', `Bearer ${token}`);
  return body ? req.send(body) : req;
};
const grant = (ownerToken, userId, key, enabled) =>
  call(ownerToken, 'patch', `/api/auth/company-members/${userId}/grants/${key}`, { enabled });

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

  for (const k of ['a', 'b']) co[k] = await prisma.tenant.create({ data: { name: `EG ${k} ${RUN}`, slug: `${RUN}-${k}`, status: 'ACTIVE' } });
  p.owner = await member(co.a, 'OWNER', 'owner');
  p.ownerB = await member(co.b, 'OWNER', 'ownerb');
  p.manager = await member(co.a, 'MANAGER', 'manager');
  await member(co.b, 'MANAGER', '', p.manager.id);
  p.employee = await member(co.a, 'EMPLOYEE', 'employee');
  p.contractor = await member(co.a, 'CONTRACTOR', 'contractor');

  const project = await prisma.project.create({ data: { tenantId: co.a.id, name: `Contractor project ${RUN}`, status: 'ACTIVE' } });
  await prisma.task.create({ data: { tenantId: co.a.id, projectId: project.id, title: `Assigned ${RUN}`, assignedToUserId: p.contractor.id } });
  rec.invoiceA = await prisma.invoice.create({ data: { tenantId: co.a.id, invoiceNumber: `EG-A-${RUN}`, currency: 'EUR', totalCents: 1000, status: 'SENT' } });
  rec.invoiceB = await prisma.invoice.create({ data: { tenantId: co.b.id, invoiceNumber: `EG-B-${RUN}`, currency: 'EUR', totalCents: 2000, status: 'SENT' } });
  rec.general = await prisma.chatChannel.create({ data: { tenantId: co.a.id, name: `general ${RUN}` } });
  await prisma.chatMessage.create({ data: { tenantId: co.a.id, channelId: rec.general.id, body: `internal only ${RUN}` } });
  rec.projectChannel = await prisma.chatChannel.create({ data: { tenantId: co.a.id, name: `project ${RUN}`, resourceType: 'project', resourceId: project.id } });
  rec.memberChannel = await prisma.chatChannel.create({ data: { tenantId: co.a.id, name: `member ${RUN}` } });
  await prisma.chatMembership.create({ data: { tenantId: co.a.id, channelId: rec.memberChannel.id, userId: p.contractor.id } });
  await prisma.notification.createMany({
    data: [
      { tenantId: co.a.id, recipientUserId: p.employee.id, title: `for employee ${RUN}` },
      { tenantId: co.a.id, recipientUserId: p.contractor.id, title: `for contractor ${RUN}` },
    ],
  });

  p.ownerToken = await login(p.owner, co.a);
  p.ownerBToken = await login(p.ownerB, co.b);
  p.managerToken = await login(p.manager, co.a);
  p.managerBToken = await login(p.manager, co.b);
  p.employeeToken = await login(p.employee, co.a);
  p.contractorToken = await login(p.contractor, co.a);
});
after(async () => { if (app) await app.close(); });

describe('Explicit grants: who may change them', { skip }, () => {
  it('only the OWNER of the company, only for eligible roles', async () => {
    assert.equal((await grant(p.managerToken, p.employee.id, 'decide-approvals', true)).status, 403, 'manager cannot grant');
    assert.equal((await grant(p.ownerBToken, p.employee.id, 'decide-approvals', true)).status, 403, 'other company owner cannot grant');
    assert.equal((await grant(p.ownerToken, p.employee.id, 'invoices', true)).status, 403, 'invoices is for managers');
    assert.equal((await grant(p.ownerToken, p.contractor.id, 'decide-approvals', true)).status, 403, 'contractors are not approvers');
    assert.equal((await grant(p.ownerToken, p.owner.id, 'invoices', true)).status, 403, 'owners need no grant');
    assert.equal((await grant(p.ownerToken, p.manager.id, 'everything', true)).status, 400);
  });

  it('records each change in the audit log', async () => {
    assert.equal((await grant(p.ownerToken, p.manager.id, 'decide-approvals', true)).status, 200);
    const event = await prisma.auditEvent.findFirst({
      where: { tenantId: co.a.id, action: 'membership.grant_updated', resourceId: p.manager.membershipId },
      orderBy: { createdAt: 'desc' },
    });
    assert.ok(event, 'audit event missing');
    await grant(p.ownerToken, p.manager.id, 'decide-approvals', false);
  });
});

describe('Approvals: explicit approvers only', { skip }, () => {
  it('a manager decides only after the OWNER makes them an approver, and stops when revoked', async () => {
    const a1 = await prisma.approvalRequest.create({ data: { tenantId: co.a.id, title: `A1 ${RUN}`, status: 'REQUESTED' } });
    assert.equal((await call(p.managerToken, 'post', `/api/approvals/${a1.id}/decision`, { decision: 'APPROVE' })).status, 403);
    await grant(p.ownerToken, p.manager.id, 'decide-approvals', true);
    assert.equal((await call(p.managerToken, 'post', `/api/approvals/${a1.id}/decision`, { decision: 'APPROVE' })).status, 201);
    await grant(p.ownerToken, p.manager.id, 'decide-approvals', false);
    const a2 = await prisma.approvalRequest.create({ data: { tenantId: co.a.id, title: `A2 ${RUN}`, status: 'REQUESTED' } });
    assert.equal((await call(p.managerToken, 'post', `/api/approvals/${a2.id}/decision`, { decision: 'APPROVE' })).status, 403);
  });

  it('an employee made an approver can decide; the OWNER always can', async () => {
    const a3 = await prisma.approvalRequest.create({ data: { tenantId: co.a.id, title: `A3 ${RUN}`, status: 'REQUESTED' } });
    assert.equal((await call(p.employeeToken, 'post', `/api/approvals/${a3.id}/decision`, { decision: 'APPROVE' })).status, 403);
    await grant(p.ownerToken, p.employee.id, 'decide-approvals', true);
    assert.equal((await call(p.employeeToken, 'post', `/api/approvals/${a3.id}/decision`, { decision: 'REQUEST_CHANGES' })).status, 201);
    await grant(p.ownerToken, p.employee.id, 'decide-approvals', false);
    assert.equal((await call(p.ownerToken, 'post', `/api/approvals/${a3.id}/decision`, { decision: 'APPROVE' })).status, 201);
  });

  it('My Work lists approvals to decide only for approvers', async () => {
    await prisma.approvalRequest.create({ data: { tenantId: co.a.id, title: `A4 ${RUN}`, status: 'REQUESTED', requestedByUserId: p.employee.id } });
    assert.equal((await call(p.managerToken, 'get', '/api/my-work')).body.approvals.toDecide.length, 0);
    assert.ok((await call(p.ownerToken, 'get', '/api/my-work')).body.approvals.toDecide.length > 0);
  });
});

describe('Invoices: managers need the explicit grant, per company', { skip }, () => {
  it('is refused by default, allowed with the grant, refused again when revoked', async () => {
    assert.equal((await call(p.managerToken, 'get', '/api/invoices')).status, 403);
    assert.equal((await call(p.managerToken, 'get', `/api/invoices/${rec.invoiceA.id}`)).status, 403);
    await grant(p.ownerToken, p.manager.id, 'invoices', true);
    assert.equal((await call(p.managerToken, 'get', '/api/invoices')).status, 200);
    assert.equal((await call(p.managerToken, 'get', `/api/invoices/${rec.invoiceA.id}`)).status, 200);
    assert.equal((await call(p.managerToken, 'get', '/api/finance/summary')).status, 403, 'finance summary stays OWNER-only');
    await grant(p.ownerToken, p.manager.id, 'invoices', false);
    assert.equal((await call(p.managerToken, 'get', '/api/invoices')).status, 403);
  });

  it('a grant in one company does not open another company', async () => {
    await grant(p.ownerToken, p.manager.id, 'invoices', true);
    assert.equal((await call(p.managerBToken, 'get', '/api/invoices')).status, 403);
    assert.equal((await call(p.managerBToken, 'get', `/api/invoices/${rec.invoiceB.id}`)).status, 403);
    await grant(p.ownerToken, p.manager.id, 'invoices', false);
  });
});

describe('Contractor: chat and notifications are scoped', { skip }, () => {
  it('lists only member and assigned-project channels', async () => {
    const res = await call(p.contractorToken, 'get', '/api/chat/channels');
    assert.equal(res.status, 200);
    const ids = res.body.map((c) => c.id);
    assert.ok(ids.includes(rec.projectChannel.id) && ids.includes(rec.memberChannel.id));
    assert.ok(!ids.includes(rec.general.id), 'general channel must be hidden');
  });

  it('cannot read or post in an unrelated channel', async () => {
    assert.equal((await call(p.contractorToken, 'get', `/api/chat/channels/${rec.general.id}/messages`)).status, 404);
    assert.equal((await call(p.contractorToken, 'post', `/api/chat/channels/${rec.general.id}/messages`, { body: 'hi' })).status, 404);
    assert.equal((await call(p.contractorToken, 'get', `/api/chat/channels/${rec.memberChannel.id}/messages`)).status, 200);
  });

  it('employees keep the company channels', async () => {
    const ids = (await call(p.employeeToken, 'get', '/api/chat/channels')).body.map((c) => c.id);
    assert.ok(ids.includes(rec.general.id));
  });

  it('notifications are the contractor\'s own only', async () => {
    const res = await call(p.contractorToken, 'get', '/api/notifications');
    assert.equal(res.status, 200);
    const text = JSON.stringify(res.body);
    assert.ok(text.includes(`for contractor ${RUN}`));
    assert.ok(!text.includes(`for employee ${RUN}`));
  });
});
