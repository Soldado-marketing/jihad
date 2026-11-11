/**
 * D07 — customer history API: GET /api/customers/:id/history.
 *
 * One list, newest first, of what happened with a customer: delivery rounds
 * and decisions, work requests and problem reports with their messages,
 * appointments, invoices and payments. Proven here over HTTP against a real
 * database:
 *   - every round and every request of the customer is there, in order;
 *   - requests, problem reports and internal notes only for OWNER and MANAGER;
 *   - a CLIENT is refused, and the client's own view still has no internal note;
 *   - money only for the OWNER; sections follow the caller's permissions;
 *   - a contractor sees only assigned work; another customer or company never leaks;
 *   - no staff identity in any entry; paging returns every entry exactly once.
 *
 * Prerequisites (otherwise the whole suite skips rather than failing):
 *   npm run build; migrated PostgreSQL; DATABASE_URL + JWT_SECRET; MAOS_INTEGRATION=1.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const skip = process.env.MAOS_INTEGRATION !== '1'
  ? 'set MAOS_INTEGRATION=1 to run'
  : !existsSync(join(apiRoot, 'dist/modules/customers/customer-history.service.js'))
    ? 'run `npm run build` first'
    : !(process.env.DATABASE_URL && process.env.JWT_SECRET)
      ? 'DATABASE_URL and JWT_SECRET must be set'
      : false;

const RUN = `ch${Date.now().toString(36)}`;
const PASSWORD = 'HistoryPass123!';
const SECRET_NOTE = `INTERNAL-ONLY-${RUN} the client is difficult`;
const MONEY_KEYS = ['totalCents', 'amountCents', 'paidCents', 'subtotalCents', 'budgetCents'];
const DAY = 86400000;
const NOW = Date.now();
const ago = (days, ms = 0) => new Date(NOW - days * DAY + ms);

let app; let server; let request; let prisma;
const t = {}; const people = {}; const d = {};

const get = (who, url) => request(server).get(`/api${url}`).set('Authorization', `Bearer ${people[who].token}`);
const history = (who, id = d.c1, query = '') => get(who, `/customers/${id}/history${query}`);
const ids = (body) => body.items.map((e) => e.id);
const has = (body, id) => ids(body).includes(id);
const moneyIn = (body) => MONEY_KEYS.filter((k) => JSON.stringify(body).includes(`"${k}"`));

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
  prisma = app.get(require(join(apiRoot, 'dist/modules/prisma/prisma.service.js')).PrismaService);

  const hash = await require('bcrypt').hash(PASSWORD, 10);
  for (const name of ['a', 'b']) {
    t[name] = await prisma.tenant.create({ data: { name: `T${name} ${RUN}`, slug: `t${name}-${RUN}`, status: 'ACTIVE' }, select: { id: true } });
  }
  let ip = 0;
  async function member(tenant, label, role, clientScopeKey) {
    const email = `${label}-${RUN}@example.test`;
    const displayName = `Staffname ${label} ${RUN}`;
    const user = await prisma.user.create({ data: { email, displayName, passwordHash: hash, status: 'APPROVED' }, select: { id: true } });
    const m = await prisma.tenantMembership.create({
      data: { tenantId: t[tenant].id, userId: user.id, role, status: 'ACTIVE', visibilityScope: clientScopeKey ? 'CLIENT_LEVEL' : 'TENANT_WIDE', clientScopeKey },
      select: { id: true },
    });
    const res = await request(server).post('/api/auth/login').set('X-Forwarded-For', `198.51.100.${++ip}`).send({ email, passwordOrMagicCode: PASSWORD, tenantSlug: `t${tenant}-${RUN}` });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return { id: user.id, email, displayName, membershipId: m.id, token: res.body.tokens.accessToken };
  }
  const k1 = `hi-one-${RUN}`; const k2 = `hi-two-${RUN}`;
  d.k1 = k1;
  people.owner = await member('a', 'owner', 'OWNER');
  people.manager = await member('a', 'manager', 'MANAGER');
  people.employee = await member('a', 'employee', 'EMPLOYEE');
  people.contractor = await member('a', 'contractor', 'CONTRACTOR');
  people.scoped = await member('a', 'scoped', 'CONTRACTOR');
  people.reviewer = await member('a', 'reviewer', 'CONTRACTOR');
  people.client = await member('a', 'client', 'CLIENT', k1);
  people.foreign = await member('b', 'foreign', 'OWNER');
  // Custom grants: two contractors may read customers, one of them approvals too; the manager may read invoices (not finance).
  await prisma.membershipPermission.create({ data: { membershipId: people.scoped.membershipId, action: 'read', resource: 'customer' } });
  await prisma.membershipPermission.create({ data: { membershipId: people.reviewer.membershipId, action: 'read', resource: 'customer' } });
  await prisma.membershipPermission.create({ data: { membershipId: people.reviewer.membershipId, action: 'read', resource: 'approval' } });
  await prisma.membershipPermission.create({ data: { membershipId: people.manager.membershipId, action: 'read', resource: 'invoice' } });

  const A = t.a.id; const B = t.b.id;
  d.c1 = (await prisma.customer.create({ data: { tenantId: A, clientScopeKey: k1, name: `One ${RUN}` }, select: { id: true } })).id;
  d.c2 = (await prisma.customer.create({ data: { tenantId: A, clientScopeKey: k2, name: `Two ${RUN}` }, select: { id: true } })).id;
  d.cb = (await prisma.customer.create({ data: { tenantId: B, clientScopeKey: k1, name: `Foreign ${RUN}` }, select: { id: true } })).id;
  const row = async (model, data) => (await prisma[model].create({ data, select: { id: true } })).id;

  d.p1 = await row('project', { tenantId: A, name: `P1 ${RUN}`, customerId: d.c1, clientScopeKey: k1 });
  d.p3 = await row('project', { tenantId: A, name: `P3 ${RUN}`, customerId: d.c1, clientScopeKey: k1 });
  d.p2 = await row('project', { tenantId: A, name: `P2 ${RUN}`, customerId: d.c2, clientScopeKey: k2 });
  for (const who of ['scoped', 'reviewer']) await prisma.projectMember.create({ data: { tenantId: A, projectId: d.p3, userId: people[who].id, role: 'CONTRACTOR' } });

  d.f1 = await row('fileAsset', { tenantId: A, projectId: d.p1, name: `f1-${RUN}`, customerId: d.c1, clientScopeKey: k1 });
  d.f3 = await row('fileAsset', { tenantId: A, projectId: d.p3, name: `f3-${RUN}`, customerId: d.c1, clientScopeKey: k1 });
  d.f2 = await row('fileAsset', { tenantId: A, projectId: d.p2, name: `f2-${RUN}`, customerId: d.c2, clientScopeKey: k2 });

  // Delivery on f1: round 1 → the client asks for a change → the company resubmits (round 2) → approved.
  const delivery = (fileAssetId, key, title, status, createdAt, extra = {}) =>
    row('approvalRequest', { tenantId: A, fileAssetId, title, status, clientVisible: true, clientScopeKey: key, createdAt, ...extra });
  const decision = (approvalRequestId, type, by, createdAt, note) =>
    row('approvalDecision', { tenantId: A, approvalRequestId, decision: type, decidedByUserId: by, createdAt, note });
  const resubmitted = ago(8);
  d.r1 = await delivery(d.f1, k1, `Logo film ${RUN}`, 'CANCELED', ago(10));
  d.r1change = await decision(d.r1, 'REQUEST_CHANGES', people.client.id, ago(9), 'Please make the logo larger.');
  d.r1reply = await decision(d.r1, 'CANCEL', people.employee.id, resubmitted, 'Logo enlarged, see the new version.');
  d.r2 = await delivery(d.f1, k1, `Logo film ${RUN}`, 'APPROVED', resubmitted); // same instant as the reply above
  d.r2ok = await decision(d.r2, 'APPROVE', people.client.id, ago(7));
  d.r3 = await delivery(d.f3, k1, `Poster ${RUN}`, 'REQUESTED', ago(3), { dueAt: ago(-5) });
  // Not deliveries / not this customer:
  d.internalApproval = await row('approvalRequest', { tenantId: A, fileAssetId: d.f1, title: `Internal check ${RUN}`, status: 'REQUESTED', clientVisible: false, clientScopeKey: k1, createdAt: ago(4) });
  d.otherDelivery = await delivery(d.f2, k2, `Other customer ${RUN}`, 'REQUESTED', ago(2));

  // Problem report: opened, internal note, answer, resolved, reopened by the client. Work request: opened.
  const channel = (tenantId, key, kind, name, createdAt) => row('chatChannel', { tenantId, type: 'CLIENT', name, resourceType: kind, clientScopeKey: key, createdByUserId: people.client.id, createdAt });
  const message = (channelId, by, clientVisible, body, createdAt) => row('chatMessage', { tenantId: A, channelId, body, createdByUserId: by, clientVisible, clientScopeKey: k1, createdAt });
  const state = (resourceType, action, resourceId, createdAt, payload = {}) =>
    row('auditEvent', { tenantId: A, actorId: people.manager.id, actorRole: 'MANAGER', resourceType, resourceId, action, outcome: 'SUCCESS', redactedPayload: payload, createdAt });
  d.problem = await channel(A, k1, 'complaint', `Late delivery ${RUN}`, ago(6));
  await prisma.chatMembership.create({ data: { tenantId: A, channelId: d.problem, userId: people.client.id, role: 'CLIENT', clientScopeKey: k1 } });
  d.m1 = await message(d.problem, people.client.id, true, 'The film arrived two days late.', ago(6, 1));
  d.mNote = await message(d.problem, people.manager.id, false, SECRET_NOTE, ago(5));
  d.mAnswer = await message(d.problem, people.manager.id, true, 'We are sorry. The next one comes early.', ago(4, 5));
  d.resolved = await state('Complaint', 'complaint.resolved', d.problem, ago(3, 5));
  d.reopened = await state('Complaint', 'complaint.reopened', d.problem, ago(2, 5), { by: 'client' });
  d.noise = await state('Complaint', 'complaint.note', d.problem, ago(5, 1)); // not a state change
  d.request = await channel(A, k1, 'request', `Second film ${RUN}`, ago(1));
  d.mReq = await message(d.request, people.client.id, true, 'Can you shoot a second film in May?', ago(1, 1));
  // Not this customer / not a conversation:
  d.otherProblem = await channel(A, k2, 'complaint', `Other customer problem ${RUN}`, ago(1));
  d.foreignProblem = await channel(B, k1, 'complaint', `Foreign company problem ${RUN}`, ago(1));
  d.plainChat = await row('chatChannel', { tenantId: A, type: 'CLIENT', name: `Plain chat ${RUN}`, clientScopeKey: k1, createdAt: ago(1) });

  // Appointments: one in each of the customer's projects, one for the other customer, one ordinary task.
  const label = await row('label', { tenantId: A, name: 'Shooting appointment' });
  const shoot = async (projectId, title, dueAt, assignedToUserId) => {
    const id = await row('task', { tenantId: A, projectId, title, status: 'TODO', dueAt, description: 'Location: Studio 1', assignedToUserId });
    await prisma.taskLabel.create({ data: { tenantId: A, taskId: id, labelId: label } });
    return id;
  };
  d.shoot1 = await shoot(d.p1, `Shoot one ${RUN}`, ago(-2), people.employee.id);
  d.shoot3 = await shoot(d.p3, `Shoot three ${RUN}`, ago(-4));
  d.shootOther = await shoot(d.p2, `Shoot other ${RUN}`, ago(-1));
  d.plainTask = await row('task', { tenantId: A, projectId: d.p1, title: `Plain task ${RUN}`, status: 'TODO', dueAt: ago(-1) });

  // Invoices and a payment.
  const invoice = (n, customerId, key, status, totalCents, createdAt) =>
    row('invoice', { tenantId: A, invoiceNumber: `${n}-${RUN}`, currency: 'EUR', customerId, clientScopeKey: key, status, subtotalCents: totalCents, totalCents, createdAt, issuedAt: createdAt });
  d.i1 = await invoice('I1', d.c1, k1, 'PARTIALLY_PAID', 10000, ago(12));
  d.iDraft = await invoice('ID', d.c1, k1, 'DRAFT', 999, ago(11));
  d.iOther = await invoice('I2', d.c2, k2, 'SENT', 7777, ago(11));
  d.pay1 = await row('payment', { tenantId: A, invoiceId: d.i1, amountCents: 2500, currency: 'EUR', clientScopeKey: k1, createdAt: ago(11, 9) });
  d.payOther = await row('payment', { tenantId: A, invoiceId: d.iOther, amountCents: 1, currency: 'EUR', clientScopeKey: k2, createdAt: ago(10, 9) });
});

after(async () => {
  if (app) await app.close();
});

describe('D07 — customer history', { skip }, () => {
  it('OWNER: every delivery round, decision, request, problem, appointment, invoice and payment, newest first', async () => {
    const res = await history('owner');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const b = res.body;
    assert.deepEqual(b.customer, { id: d.c1, name: `One ${RUN}` });
    assert.deepEqual(b.sections, ['deliveries', 'conversations', 'appointments', 'invoices', 'finance']);
    assert.equal(b.nextBefore, null);
    assert.deepEqual(ids(b), [
      `h:${d.shoot3}`, `h:${d.shoot1}`,
      `d:${d.mReq}`, `c:${d.request}`,
      `e:${d.reopened}`, `e:${d.resolved}`, `a:${d.r3}`,
      `d:${d.mAnswer}`, `d:${d.mNote}`, `d:${d.m1}`, `c:${d.problem}`,
      `b:${d.r2ok}`, `b:${d.r1reply}`, `a:${d.r2}`, `b:${d.r1change}`, `a:${d.r1}`,
      `g:${d.pay1}`, `f:${d.i1}`,
    ], 'complete, ordered by time and then by id');
    const times = b.items.map((e) => Date.parse(e.at));
    assert.deepEqual(times, [...times].sort((x, y) => y - x));
  });

  it('a delivery reads as its rounds: sent, the client asks for a change, the company replies and resubmits, the client approves', async () => {
    const by = Object.fromEntries((await history('owner')).body.items.map((e) => [e.id, e]));
    const sent1 = by[`a:${d.r1}`];
    assert.deepEqual({ kind: sent1.kind, event: sent1.event, from: sent1.from, status: sent1.status, ref: sent1.ref }, { kind: 'delivery', event: 'sent', from: 'company', status: 'CANCELED', ref: { type: 'file', id: d.f1 } });
    const change = by[`b:${d.r1change}`];
    assert.deepEqual({ event: change.event, from: change.from, note: change.note }, { event: 'changes_requested', from: 'client', note: 'Please make the logo larger.' });
    const reply = by[`b:${d.r1reply}`];
    assert.deepEqual({ event: reply.event, from: reply.from, note: reply.note }, { event: 'replied', from: 'company', note: 'Logo enlarged, see the new version.' });
    assert.equal(by[`a:${d.r2}`].status, 'APPROVED');
    assert.deepEqual({ event: by[`b:${d.r2ok}`].event, from: by[`b:${d.r2ok}`].from }, { event: 'approved', from: 'client' });
    assert.ok(by[`a:${d.r3}`].meta.reviewBy, 'the open round carries its review-by time');
  });

  it('a problem report and a work request read as opened, messages, resolved and reopened; the internal note is flagged', async () => {
    const by = Object.fromEntries((await history('manager')).body.items.map((e) => [e.id, e]));
    assert.deepEqual({ kind: by[`c:${d.problem}`].kind, event: by[`c:${d.problem}`].event, ref: by[`c:${d.problem}`].ref }, { kind: 'problem', event: 'opened', ref: { type: 'problem', id: d.problem } });
    assert.deepEqual({ kind: by[`c:${d.request}`].kind, ref: by[`c:${d.request}`].ref }, { kind: 'request', ref: { type: 'request', id: d.request } });
    assert.deepEqual({ from: by[`d:${d.m1}`].from, internal: by[`d:${d.m1}`].internal, note: by[`d:${d.m1}`].note }, { from: 'client', internal: undefined, note: 'The film arrived two days late.' });
    assert.deepEqual({ from: by[`d:${d.mNote}`].from, internal: by[`d:${d.mNote}`].internal, note: by[`d:${d.mNote}`].note }, { from: 'company', internal: true, note: SECRET_NOTE });
    assert.equal(by[`d:${d.mAnswer}`].internal, undefined);
    assert.deepEqual({ event: by[`e:${d.resolved}`].event, from: by[`e:${d.resolved}`].from }, { event: 'resolved', from: 'company' });
    assert.deepEqual({ event: by[`e:${d.reopened}`].event, from: by[`e:${d.reopened}`].from }, { event: 'reopened', from: 'client' });
    assert.equal(by[`e:${d.noise}`], undefined, 'a note event is not a state change');
  });

  it('nothing of another customer, another company, an internal approval, a plain chat, a draft invoice or an ordinary task appears', async () => {
    const b = (await history('owner')).body;
    const text = JSON.stringify(b);
    for (const id of [d.otherDelivery, d.internalApproval, d.otherProblem, d.foreignProblem, d.plainChat, d.shootOther, d.plainTask, d.iDraft, d.iOther, d.payOther]) {
      assert.ok(!text.includes(id), `row ${id} must not appear`);
    }
    for (const word of ['Other customer', 'Foreign company', 'Internal check', 'Plain chat', 'Plain task', 'Shoot other']) {
      assert.ok(!text.includes(word), `"${word}" must not appear`);
    }
    // The other customer's own history holds its own rows and none of this one's.
    const other = (await history('owner', d.c2)).body;
    assert.ok(has(other, `a:${d.otherDelivery}`) && has(other, `c:${d.otherProblem}`) && has(other, `h:${d.shootOther}`) && has(other, `f:${d.iOther}`));
    assert.ok(!JSON.stringify(other).includes(d.r1) && !JSON.stringify(other).includes(SECRET_NOTE));
  });

  it('MANAGER with invoice access: conversations and invoices, but no amount and no payment', async () => {
    const b = (await history('manager')).body;
    assert.deepEqual(b.sections, ['deliveries', 'conversations', 'appointments', 'invoices']);
    assert.ok(has(b, `f:${d.i1}`) && has(b, `d:${d.mNote}`));
    assert.ok(!has(b, `g:${d.pay1}`), 'payments are finance');
    assert.deepEqual(moneyIn(b), [], 'no money key for a manager');
    const owner = (await history('owner')).body;
    assert.deepEqual(moneyIn(owner).sort(), ['amountCents', 'totalCents']);
    assert.equal(owner.items.find((e) => e.id === `f:${d.i1}`).meta.totalCents, 10000);
    assert.equal(owner.items.find((e) => e.id === `g:${d.pay1}`).meta.amountCents, 2500);
  });

  it('EMPLOYEE: deliveries and own appointments only — no request, no problem report, no internal note, no invoice', async () => {
    const res = await history('employee');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const b = res.body;
    assert.deepEqual(b.sections, ['deliveries', 'appointments']);
    assert.deepEqual([...new Set(b.items.map((e) => e.kind))].sort(), ['appointment', 'delivery']);
    const text = JSON.stringify(b);
    assert.ok(!text.includes(SECRET_NOTE) && !text.includes('Late delivery') && !text.includes('Second film') && !text.includes('"internal"'));
    assert.ok(has(b, `a:${d.r1}`) && has(b, `b:${d.r1change}`) && has(b, `h:${d.shoot1}`));
    assert.ok(!has(b, `h:${d.shoot3}`), 'an appointment the employee is not assigned to stays out, as in the task list');
    assert.deepEqual(moneyIn(b), []);
  });

  it('a contractor granted customer access sees only assigned work: appointments, and deliveries only with approval access; a default contractor is refused', async () => {
    const res = await history('scoped');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(res.body.sections, ['appointments'], 'a contractor has no approval access by default');
    assert.deepEqual(ids(res.body), [`h:${d.shoot3}`], 'only the project the contractor is a member of');
    const reviewer = await history('reviewer');
    assert.equal(reviewer.status, 200, JSON.stringify(reviewer.body));
    assert.deepEqual(reviewer.body.sections, ['deliveries', 'appointments']);
    assert.deepEqual(ids(reviewer.body), [`h:${d.shoot3}`, `a:${d.r3}`], 'the delivery of the member project only, none of the other project');
    for (const body of [res.body, reviewer.body]) assert.ok(!JSON.stringify(body).includes(SECRET_NOTE) && !JSON.stringify(body).includes('Logo film'));
    assert.equal((await history('contractor')).status, 403);
  });

  it('a CLIENT never sees internal notes: the history refuses a client, and the client\'s own view of the report has none', async () => {
    const refused = await history('client');
    assert.equal(refused.status, 403);
    assert.ok(!JSON.stringify(refused.body).includes(SECRET_NOTE));
    const own = await get('client', `/client/problems/${d.problem}`);
    assert.equal(own.status, 200, JSON.stringify(own.body));
    const text = JSON.stringify(own.body);
    assert.ok(text.includes('The film arrived two days late.'), 'the client sees the conversation');
    assert.ok(!text.includes(SECRET_NOTE), 'but never the internal note');
    assert.equal((await request(server).get(`/api/customers/${d.c1}/history`)).status, 401);
  });

  it('another company cannot read the history (404), also when it owns a customer with the same client key', async () => {
    assert.equal((await history('foreign', d.c1)).status, 404);
    const own = await history('foreign', d.cb);
    assert.equal(own.status, 200);
    assert.deepEqual(ids(own.body), [`c:${d.foreignProblem}`], 'its own report only');
    assert.equal((await history('owner', d.cb)).status, 404);
  });

  it('no staff identity in any entry: no user id, name or e-mail; speakers are client or company', async () => {
    for (const who of ['owner', 'manager', 'employee', 'scoped', 'reviewer']) {
      const b = (await history(who)).body;
      const text = JSON.stringify(b);
      for (const person of Object.values(people)) {
        assert.ok(!text.includes(person.id), `${who}: a user id leaked`);
        assert.ok(!text.includes(person.email), `${who}: an e-mail leaked`);
        assert.ok(!text.includes(person.displayName), `${who}: a name leaked`);
      }
      assert.ok(!text.includes('Staffname') && !text.includes('UserId') && !text.includes('example.test'));
      for (const e of b.items) assert.ok(e.from === undefined || e.from === 'client' || e.from === 'company');
    }
  });

  it('paging: every entry exactly once for any page size, also across the two entries that share an instant', async () => {
    const all = ids((await history('owner', d.c1, '?limit=100')).body);
    assert.equal(all.length, 18);
    assert.ok(all.indexOf(`b:${d.r1reply}`) + 1 === all.indexOf(`a:${d.r2}`), 'the reply and the new round share one instant');
    for (const limit of [1, 2, 5, 17, 18]) {
      const seen = [];
      let query = `?limit=${limit}`;
      for (let i = 0; i < 40; i += 1) {
        const res = await history('owner', d.c1, query);
        assert.equal(res.status, 200, JSON.stringify(res.body));
        assert.ok(res.body.items.length <= limit);
        seen.push(...ids(res.body));
        if (!res.body.nextBefore) break;
        query = `?limit=${limit}&before=${encodeURIComponent(res.body.nextBefore)}`;
      }
      assert.deepEqual(seen, all, `limit ${limit}`);
    }
  });

  it('paging over many rows on one timestamp (130 invoices created in the same instant) loses and repeats nothing', async () => {
    const instant = ago(30);
    const c = (await prisma.customer.create({ data: { tenantId: t.a.id, clientScopeKey: `hi-bulk-${RUN}`, name: `Bulk ${RUN}` }, select: { id: true } })).id;
    await prisma.invoice.createMany({
      data: Array.from({ length: 130 }, (_, i) => ({ tenantId: t.a.id, invoiceNumber: `B${i}-${RUN}`, currency: 'EUR', customerId: c, status: 'SENT', totalCents: 100 + i, subtotalCents: 100 + i, createdAt: instant })),
    });
    const seen = [];
    let query = '?limit=50';
    for (let i = 0; i < 10; i += 1) {
      const res = await history('owner', c, query);
      assert.equal(res.status, 200, JSON.stringify(res.body));
      seen.push(...ids(res.body));
      if (!res.body.nextBefore) break;
      query = `?limit=50&before=${encodeURIComponent(res.body.nextBefore)}`;
    }
    assert.equal(seen.length, 130);
    assert.equal(new Set(seen).size, 130);
    assert.deepEqual(seen, [...seen].sort().reverse(), 'ordered by id descending within the instant');
  });

  it('bad input is refused with 400; the answer is never cached', async () => {
    for (const q of ['?limit=0', '?limit=101', '?limit=abc', '?limit=1.5', '?before=yesterday', '?before=2026-11-01T10:00:00.000Z', `?before=${encodeURIComponent('2026-11-01T10:00:00.000Z|z:x')}`, `?before=${encodeURIComponent("2026-11-01T10:00:00.000Z|a:x' OR 1=1")}`]) {
      const res = await history('owner', d.c1, q);
      assert.equal(res.status, 400, `${q} → ${res.status}`);
      assert.ok(['INVALID_LIMIT', 'INVALID_BEFORE'].includes(res.body.code ?? res.body.error?.code ?? res.body.message?.code), JSON.stringify(res.body));
    }
    const ok = await history('owner', d.c1, '?limit=1');
    assert.equal(ok.status, 200);
    assert.match(ok.headers['cache-control'] ?? '', /no-store/);
    assert.equal((await history('owner', `missing-${RUN}`)).status, 404);
  });

  it('reading the history writes nothing', async () => {
    const count = async () => [
      await prisma.auditEvent.count({ where: { tenantId: t.a.id } }),
      await prisma.notification.count({ where: { tenantId: t.a.id } }),
      await prisma.chatMessage.count({ where: { tenantId: t.a.id } }),
      await prisma.approvalDecision.count({ where: { tenantId: t.a.id } }),
    ];
    const beforeCounts = await count();
    for (const who of ['owner', 'manager', 'employee', 'scoped']) await history(who);
    assert.deepEqual(await count(), beforeCounts);
  });
});
