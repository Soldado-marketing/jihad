/**
 * Client problem reports and invoice customer scope (owner decision 2026-11-02).
 *  - "Report a problem" goes to the company's managers (owners when there is
 *    none), never to an employee; the client sees the company, not a person;
 *    internal notes never reach the client; the generic chat API never lists
 *    these channels, so an employee cannot read them there.
 *  - A new invoice on a customer's project belongs to that customer; a request
 *    naming another customer is refused; existing invoices are untouched.
 * Real Nest HTTP + isolated test database; no e-mail is sent.
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
const RUN = 'cx' + Date.now().toString(36);
const PASSWORD = 'ClientComplaintsTest123!';

let app, server, request, prisma;
const co = {};
const p = {};
const rec = {};

async function member(tenant, role, label, extra = {}) {
  const bcrypt = require('bcrypt');
  const user = await prisma.user.create({
    data: { email: `${label}-${RUN}@example.test`, displayName: `${label} Person ${RUN}`, passwordHash: await bcrypt.hash(PASSWORD, 10), status: 'APPROVED' },
  });
  await prisma.tenantMembership.create({ data: { tenantId: tenant.id, userId: user.id, role, status: 'ACTIVE', ...extra } });
  return { id: user.id, email: user.email, name: user.displayName };
}
let ip = 0;
async function login(person, tenant) {
  const res = await request(server).post('/api/auth/login').set('X-Forwarded-For', `198.51.100.${++ip}`).send({ email: person.email, passwordOrMagicCode: PASSWORD, tenantSlug: tenant.slug });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.tokens.accessToken;
}
const call = (token, method, path, body) => {
  const req = request(server)[method](path).set('Authorization', `Bearer ${token}`);
  return body ? req.send(body) : req;
};
const notesFor = (resourceId) => prisma.notification.findMany({ where: { resourceId }, orderBy: { createdAt: 'asc' } });

/** No staff identity may appear in anything a client receives. */
function assertNoStaffIdentity(body) {
  const text = JSON.stringify(body);
  for (const who of [p.employee, p.manager, p.manager2, p.owner]) {
    assert.ok(!text.includes(who.id), 'staff id leaked');
    assert.ok(!text.includes(who.email), 'staff e-mail leaked');
    assert.ok(!text.includes(who.name), 'staff name leaked');
  }
  assert.doesNotMatch(text, /createdByUserId|actorUserId|actorId|author|internal/);
}

before(async () => {
  if (skip) return;
  require('reflect-metadata');
  const { NestFactory } = require('@nestjs/core');
  const { ValidationPipe } = require('@nestjs/common');
  const { AppModule } = require(join(apiRoot, 'dist/app.module.js'));
  const { AllExceptionsFilter } = require(join(apiRoot, 'dist/common/http/all-exceptions.filter.js'));
  app = await NestFactory.create(AppModule, { logger: false });
  require(join(apiRoot, 'dist/common/http/trust-proxy.js')).configureTrustProxy(app, {});
  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));
  await app.init();
  await app.listen(0, '127.0.0.1');
  server = app.getHttpServer();
  request = require('supertest');
  const { PrismaService } = require(join(apiRoot, 'dist/modules/prisma/prisma.service.js'));
  prisma = app.get(PrismaService);

  co.a = await prisma.tenant.create({ data: { name: `Agency A ${RUN}`, slug: `${RUN}-a`, status: 'ACTIVE' } });
  co.b = await prisma.tenant.create({ data: { name: `Agency B ${RUN}`, slug: `${RUN}-b`, status: 'ACTIVE' } });
  p.owner = await member(co.a, 'OWNER', 'owner');
  p.manager = await member(co.a, 'MANAGER', 'manager');
  p.manager2 = await member(co.a, 'MANAGER', 'manager2');
  p.employee = await member(co.a, 'EMPLOYEE', 'employee');
  p.contractor = await member(co.a, 'CONTRACTOR', 'contractor');
  p.clientX = await member(co.a, 'CLIENT', 'clientx', { clientScopeKey: `x-${RUN}`, visibilityScope: 'CLIENT_LEVEL' });
  p.clientY = await member(co.a, 'CLIENT', 'clienty', { clientScopeKey: `y-${RUN}`, visibilityScope: 'CLIENT_LEVEL' });
  p.ownerB = await member(co.b, 'OWNER', 'ownerb'); // company B has no manager: reports fall back to the owner
  p.clientB = await member(co.b, 'CLIENT', 'clientb', { clientScopeKey: `x-${RUN}`, visibilityScope: 'CLIENT_LEVEL' });

  const custX = await prisma.customer.create({ data: { tenantId: co.a.id, name: `Customer X ${RUN}`, clientScopeKey: `x-${RUN}` } });
  rec.projX = await prisma.project.create({ data: { tenantId: co.a.id, name: `Project X ${RUN}`, status: 'ACTIVE', customerId: custX.id, clientScopeKey: `x-${RUN}`, clientVisible: true } });
  rec.projInternal = await prisma.project.create({ data: { tenantId: co.a.id, name: `Internal ${RUN}`, status: 'ACTIVE' } });
  rec.deliveryX = await prisma.approvalRequest.create({ data: { tenantId: co.a.id, title: `Reel ${RUN}`, status: 'REQUESTED', clientVisible: true, clientScopeKey: `x-${RUN}`, requestedByUserId: p.employee.id } });
  rec.deliveryY = await prisma.approvalRequest.create({ data: { tenantId: co.a.id, title: `Y reel ${RUN}`, status: 'REQUESTED', clientVisible: true, clientScopeKey: `y-${RUN}`, requestedByUserId: p.employee.id } });
  rec.plainChannel = await prisma.chatChannel.create({ data: { tenantId: co.a.id, name: `General ${RUN}`, type: 'INTERNAL', createdByUserId: p.owner.id } });

  for (const k of ['owner', 'manager', 'manager2', 'employee', 'contractor', 'clientX', 'clientY']) p[k + 'Token'] = await login(p[k], co.a);
  p.ownerBToken = await login(p.ownerB, co.b);
  p.clientBToken = await login(p.clientB, co.b);
});
after(async () => { if (app) await app.close(); });

const report = (overrides = {}) => ({ subject: `Shooting day ${RUN}`, body: 'The crew arrived two hours late and nobody told us.', ...overrides });

describe('Report a problem: only a client opens one, only about its own delivery', { skip }, () => {
  it('refuses staff and bad input, and a delivery of another client is not found', async () => {
    for (const [who, token] of [['owner', p.ownerToken], ['manager', p.managerToken], ['employee', p.employeeToken], ['contractor', p.contractorToken]]) {
      assert.equal((await call(token, 'post', '/api/client/problems', report())).status, 403, who);
      assert.equal((await call(token, 'get', '/api/client/problems')).status, 403, `${who} list`);
    }
    assert.equal((await call(p.clientXToken, 'post', '/api/client/problems', report({ subject: 'x' }))).status, 400, 'subject too short');
    assert.equal((await call(p.clientXToken, 'post', '/api/client/problems', report({ body: 'bad' }))).status, 400, 'body too short');
    assert.equal((await call(p.clientXToken, 'post', '/api/client/problems', report({ employeeId: p.employee.id }))).status, 400, 'unknown field');
    assert.equal((await call(p.clientXToken, 'post', '/api/client/problems', report({ deliveryId: rec.deliveryY.id }))).status, 404, "another client's delivery");
  });

  it('client X reports a problem about its delivery; every manager is told, the employee is not', async () => {
    const res = await call(p.clientXToken, 'post', '/api/client/problems', report({ deliveryId: rec.deliveryX.id }));
    assert.equal(res.status, 201, JSON.stringify(res.body));
    rec.report = res.body.id;
    assert.equal(res.body.status, 'OPEN');
    assert.equal(res.body.delivery.title, `Reel ${RUN}`);
    assert.equal(res.body.messages.length, 1);
    assert.equal(res.body.messages[0].from, 'you');
    assertNoStaffIdentity(res.body);

    const channel = await prisma.chatChannel.findUnique({ where: { id: rec.report }, include: { memberships: true } });
    assert.equal(channel.type, 'CLIENT');
    assert.equal(channel.resourceType, 'complaint');
    assert.equal(channel.clientScopeKey, `x-${RUN}`, 'scope from the membership, never the request');
    assert.deepEqual(channel.memberships.map((m) => m.userId), [p.clientX.id]);

    const notes = await notesFor(rec.report);
    assert.deepEqual(notes.map((n) => n.recipientUserId).sort(), [p.manager.id, p.manager2.id].sort(), 'both managers, nobody else');
    assert.equal(notes[0].resourceType, 'complaint');
    assert.ok(!notes.some((n) => n.recipientUserId === p.employee.id), 'the employee is never told');
    assert.ok(!notes.some((n) => n.recipientUserId === p.owner.id), 'the owner is not needed while managers exist');
  });

  it('a company without a manager routes the report to its owner', async () => {
    const res = await call(p.clientBToken, 'post', '/api/client/problems', report({ subject: `B problem ${RUN}` }));
    assert.equal(res.status, 201, JSON.stringify(res.body));
    rec.reportB = res.body.id;
    assert.deepEqual((await notesFor(rec.reportB)).map((n) => n.recipientUserId), [p.ownerB.id]);
  });
});

describe('Report a problem: isolation', { skip }, () => {
  it('client Y and company B see nothing of X; direct ids are not found', async () => {
    assert.deepEqual((await call(p.clientYToken, 'get', '/api/client/problems')).body, []);
    assert.equal((await call(p.clientYToken, 'get', `/api/client/problems/${rec.report}`)).status, 404);
    assert.equal((await call(p.clientYToken, 'post', `/api/client/problems/${rec.report}/messages`, { body: 'hi' })).status, 404);
    assert.equal((await call(p.clientBToken, 'get', `/api/client/problems/${rec.report}`)).status, 404, 'same scope key, other company');
    assert.equal((await call(p.ownerBToken, 'get', `/api/complaints/${rec.report}`)).status, 404, 'other company management');
    const x = await call(p.clientXToken, 'get', '/api/client/problems');
    assert.deepEqual(x.body.map((r) => r.id), [rec.report]);
  });

  it('management reads it; employees and contractors cannot, not even through the chat routes', async () => {
    for (const token of [p.ownerToken, p.managerToken]) {
      const res = await call(token, 'get', `/api/complaints/${rec.report}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.customer.name, `Customer X ${RUN}`);
      assert.equal(res.body.messages[0].from, 'client');
    }
    assert.equal((await call(p.employeeToken, 'get', '/api/complaints')).status, 403);
    assert.equal((await call(p.employeeToken, 'get', `/api/complaints/${rec.report}`)).status, 403);
    assert.equal((await call(p.contractorToken, 'get', '/api/complaints')).status, 403);
    assert.equal((await call(p.employeeToken, 'post', `/api/complaints/${rec.report}/messages`, { body: 'I was not late' })).status, 403);

    for (const token of [p.employeeToken, p.ownerToken]) {
      const channels = await call(token, 'get', '/api/chat/channels');
      assert.equal(channels.status, 200);
      const ids = channels.body.map((c) => c.id);
      assert.ok(ids.includes(rec.plainChannel.id), 'ordinary channels (no resourceType) stay listed');
      assert.ok(!ids.includes(rec.report), 'a problem report is never a chat channel');
      assert.equal((await call(token, 'get', `/api/chat/channels/${rec.report}/messages`)).status, 404, 'not readable through chat');
    }
  });
});

describe('Report a problem: answers, internal notes, resolution', { skip }, () => {
  it('an internal note stays with management; the client is not told', async () => {
    const res = await call(p.managerToken, 'post', `/api/complaints/${rec.report}/messages`, { body: 'Check the call sheet with the crew lead.', internal: true });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.status, 'OPEN', 'a note is not an answer');
    assert.equal(res.body.messages.at(-1).internal, true);
    const client = await call(p.clientXToken, 'get', `/api/client/problems/${rec.report}`);
    assert.equal(client.body.messages.length, 1, 'the note is invisible to the client');
    assert.equal((await notesFor(rec.report)).filter((n) => n.recipientUserId === p.clientX.id).length, 0);
  });

  it('an answer reaches the client as the company, without the manager\'s name', async () => {
    const res = await call(p.managerToken, 'post', `/api/complaints/${rec.report}/messages`, { body: 'We are sorry. The next shooting is on us.' });
    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'ANSWERED');
    const client = await call(p.clientXToken, 'get', `/api/client/problems/${rec.report}`);
    assert.equal(client.body.status, 'ANSWERED');
    assert.deepEqual(client.body.messages.map((m) => m.from), ['you', 'company']);
    assertNoStaffIdentity(client.body);
    const toClient = (await notesFor(rec.report)).filter((n) => n.recipientUserId === p.clientX.id);
    assert.equal(toClient.length, 1);
    assertNoStaffIdentity(toClient.map(({ title, body }) => ({ title, body })));
  });

  it('a client follow-up reopens the conversation and tells management; resolve and reopen work once each', async () => {
    const more = await call(p.clientXToken, 'post', `/api/client/problems/${rec.report}/messages`, { body: 'Thank you, that works for us.' });
    assert.equal(more.status, 201);
    assert.equal(more.body.status, 'OPEN');
    assertNoStaffIdentity(more.body);

    const resolved = await call(p.ownerToken, 'post', `/api/complaints/${rec.report}/resolve`);
    assert.equal(resolved.status, 200);
    assert.equal(resolved.body.status, 'RESOLVED');
    assert.equal((await call(p.ownerToken, 'post', `/api/complaints/${rec.report}/resolve`)).body.status, 'RESOLVED', 'idempotent');
    const list = await call(p.managerToken, 'get', '/api/complaints?status=RESOLVED');
    assert.deepEqual(list.body.map((r) => r.id), [rec.report]);
    assert.equal((await call(p.clientXToken, 'get', `/api/client/problems/${rec.report}`)).body.status, 'RESOLVED');
    const toClient = (await notesFor(rec.report)).filter((n) => n.recipientUserId === p.clientX.id);
    assert.equal(toClient.length, 2, 'answer + resolved');

    const again = await call(p.clientXToken, 'post', `/api/client/problems/${rec.report}/messages`, { body: 'Actually the invoice still shows the full day.' });
    assert.equal(again.body.status, 'OPEN', 'a client message reopens a resolved report');
    const audit = await prisma.auditEvent.findMany({ where: { resourceType: 'Complaint', resourceId: rec.report }, orderBy: { createdAt: 'asc' }, select: { action: true } });
    assert.deepEqual(audit.map((a) => a.action), ['complaint.opened', 'complaint.note', 'complaint.answered', 'complaint.resolved', 'complaint.reopened']);
  });
});

describe('Invoices: a new invoice on a customer\'s project belongs to that customer', { skip }, () => {
  const invoice = (overrides = {}) => ({ invoiceNumber: `INV-${RUN}-${Math.random().toString(36).slice(2, 6)}`, currency: 'EUR', lines: [{ description: 'Shooting', quantity: 1, unitAmountCents: 10000 }], ...overrides });

  it('inherits the project\'s customer; refuses another customer; leaves internal and project-less invoices alone', async () => {
    const inherited = await call(p.ownerToken, 'post', '/api/invoices', invoice({ projectId: rec.projX.id }));
    assert.equal(inherited.status, 201, JSON.stringify(inherited.body));
    assert.equal(inherited.body.clientScopeKey, `x-${RUN}`);
    rec.invoiceX = inherited.body.id;

    const same = await call(p.ownerToken, 'post', '/api/invoices', invoice({ projectId: rec.projX.id, clientScopeKey: `x-${RUN}` }));
    assert.equal(same.status, 201, 'naming the same customer is fine');

    const mismatch = await call(p.ownerToken, 'post', '/api/invoices', invoice({ projectId: rec.projX.id, clientScopeKey: `y-${RUN}` }));
    assert.equal(mismatch.status, 409);
    assert.match(JSON.stringify(mismatch.body), /INVOICE_SCOPE_MISMATCH/);

    const internal = await call(p.ownerToken, 'post', '/api/invoices', invoice({ projectId: rec.projInternal.id }));
    assert.equal(internal.status, 201);
    assert.equal(internal.body.clientScopeKey, null, 'an internal project gives no client scope');

    const loose = await call(p.ownerToken, 'post', '/api/invoices', invoice());
    assert.equal(loose.status, 201);
    assert.equal(loose.body.clientScopeKey, null);
  });

  it('once sent, client X sees the inherited invoice; Y and company B do not', async () => {
    // Sending needs e-mail; this suite has none, so the record is marked sent directly (what send() does besides the e-mail).
    await prisma.invoice.update({ where: { id: rec.invoiceX }, data: { status: 'SENT', clientVisible: true } });
    assert.ok((await call(p.clientXToken, 'get', '/api/client/invoices')).body.some((i) => i.id === rec.invoiceX));
    assert.equal((await call(p.clientYToken, 'get', `/api/client/invoices/${rec.invoiceX}`)).status, 404);
    assert.equal((await call(p.clientBToken, 'get', `/api/client/invoices/${rec.invoiceX}`)).status, 404);
  });
});
