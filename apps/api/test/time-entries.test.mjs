/**
 * TimeEntry API (MAOS-T72, ADR-018) over HTTP against a real database.
 *
 *   - own entries for every internal role; OWNER/MANAGER read all and review;
 *     CLIENT refused; another tenant's ids are 404 / invalid references;
 *   - project and task in the tenant, task in the project, contractor only on
 *     assigned work; customer taken from the project;
 *   - rate and cost never accepted from a request and never shown to non-OWNERs;
 *   - DRAFT -> SUBMITTED -> APPROVED / REJECTED -> DRAFT, conflicts answer 409;
 *   - database refusals (cost formula, project with time) become safe 400/409.
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

const enabled = process.env.MAOS_INTEGRATION === '1';
const built = existsSync(join(apiRoot, 'dist/modules/time-entries/time-entries.module.js'));
const configured = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET);
const skip = !enabled
  ? 'set MAOS_INTEGRATION=1 to run'
  : !built
    ? 'run `npm run build` first'
    : !configured
      ? 'DATABASE_URL and JWT_SECRET must be set'
      : false;

const RUN = `tm${Date.now().toString(36)}`;
const PASSWORD = 'TimeEntryPass123!';
const RATE_KEYS = ['rateCents', 'rateSource', 'currency', 'costCents'];

let app;
let server;
let request;
let prisma;
const t = {};
const people = {};
const d = {};

const as = (who) => ({
  get: (url) => request(server).get(`/api${url}`).set('Authorization', `Bearer ${people[who].token}`),
  post: (url, body) => request(server).post(`/api${url}`).set('Authorization', `Bearer ${people[who].token}`).send(body),
  patch: (url, body) => request(server).patch(`/api${url}`).set('Authorization', `Bearer ${people[who].token}`).send(body),
  del: (url) => request(server).delete(`/api${url}`).set('Authorization', `Bearer ${people[who].token}`),
});
const entry = (projectId, over = {}) => ({ date: '2026-10-16', minutes: 30, projectId, ...over });
const rateKeysIn = (body) => RATE_KEYS.filter((k) => JSON.stringify(body).includes(`"${k}"`));

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

  const hash = await require('bcrypt').hash(PASSWORD, 10);
  for (const name of ['a', 'b']) {
    t[name] = await prisma.tenant.create({ data: { name: `T${name} ${RUN}`, slug: `t${name}-${RUN}`, status: 'ACTIVE' }, select: { id: true } });
  }
  async function member(tenant, label, role, clientScopeKey) {
    const email = `${label}-${RUN}@example.test`;
    const user = await prisma.user.create({ data: { email, displayName: label, passwordHash: hash, status: 'APPROVED' }, select: { id: true } });
    await prisma.tenantMembership.create({
      data: { tenantId: t[tenant].id, userId: user.id, role, status: 'ACTIVE', visibilityScope: 'TENANT_WIDE', clientScopeKey },
    });
    const res = await request(server).post('/api/auth/login').send({ email, passwordOrMagicCode: PASSWORD, tenantSlug: `t${tenant}-${RUN}` });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return { id: user.id, token: res.body.tokens.accessToken };
  }
  people.owner = await member('a', 'owner', 'OWNER');
  people.manager = await member('a', 'manager', 'MANAGER');
  people.employee = await member('a', 'employee', 'EMPLOYEE');
  people.contractor = await member('a', 'contractor', 'CONTRACTOR');
  people.client = await member('a', 'client', 'CLIENT', `tk-${RUN}`);
  people.foreign = await member('b', 'foreign', 'OWNER');

  const A = t.a.id;
  d.customer = (await prisma.customer.create({ data: { tenantId: A, clientScopeKey: `tk-${RUN}`, name: 'Cust' }, select: { id: true } })).id;
  const project = (tenantId, name, extra = {}) => prisma.project.create({ data: { tenantId, name: `${name} ${RUN}`, ...extra }, select: { id: true } }).then((r) => r.id);
  d.P = await project(A, 'Member', { customerId: d.customer, clientScopeKey: `tk-${RUN}` });
  d.Q = await project(A, 'Assigned');
  d.R = await project(A, 'Other');
  d.Pb = await project(t.b.id, 'Foreign');
  await prisma.projectMember.create({ data: { tenantId: A, projectId: d.P, userId: people.contractor.id, role: 'CONTRACTOR' } });
  const task = (tenantId, projectId, title, extra = {}) => prisma.task.create({ data: { tenantId, projectId, title: `${title} ${RUN}`, ...extra }, select: { id: true } }).then((r) => r.id);
  d.tP = await task(A, d.P, 'P task');
  d.tQ = await task(A, d.Q, 'Q task', { assignedToUserId: people.contractor.id });
  d.tR = await task(A, d.R, 'R task');
  d.tB = await task(t.b.id, d.Pb, 'B task');
});

after(async () => {
  if (app) await app.close();
});

describe('time entries: create and validation (MAOS-T72)', { skip }, () => {
  it('an employee logs own time: DRAFT, billable, customer from the project, unrated, no rate fields', async () => {
    const res = await as('employee').post('/time-entries', entry(d.P, { taskId: d.tP, note: 'work' }));
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.deepEqual([res.body.status, res.body.billable, res.body.date, res.body.minutes, res.body.customerId, res.body.user.id], ['DRAFT', true, '2026-10-16', 30, d.customer, people.employee.id]);
    assert.deepEqual(rateKeysIn(res.body), []);
    const row = await prisma.timeEntry.findUnique({ where: { id: res.body.id } });
    assert.deepEqual([row.rateCents, row.costCents, row.rateSource, row.createdByUserId], [null, null, null, people.employee.id]);
    d.empEntry = res.body.id;
    const ev = await prisma.auditEvent.findFirst({ where: { tenantId: t.a.id, resourceType: 'time-entry', resourceId: d.empEntry, action: 'time_entry.created' } });
    assert.ok(ev);
  });

  it('never accepts member, customer, status, rate or cost from the request', async () => {
    for (const extra of [{ userId: people.manager.id }, { customerId: d.customer }, { status: 'APPROVED' }, { rateCents: 3000 }, { costCents: 1 }, { rateSource: 'TENANT' }]) {
      assert.equal((await as('employee').post('/time-entries', entry(d.P, extra))).status, 400, JSON.stringify(extra));
    }
  });

  it('refuses invalid minutes and dates', async () => {
    for (const minutes of [0, -1, 1441, 1.5, '30']) assert.equal((await as('employee').post('/time-entries', entry(d.P, { minutes }))).status, 400, String(minutes));
    for (const date of ['2026-02-30', '16.10.2026', '2026-1-5', '']) assert.equal((await as('employee').post('/time-entries', entry(d.P, { date }))).status, 400, date);
    assert.equal((await as('employee').post('/time-entries', entry(d.P, { minutes: 1440 }))).status, 201);
  });

  it('project and task must be in this workspace, and the task in the project', async () => {
    const wrongTask = await as('employee').post('/time-entries', entry(d.P, { taskId: d.tR }));
    assert.deepEqual([wrongTask.status, wrongTask.body.code], [400, 'TASK_NOT_IN_PROJECT']);
    const foreignProject = await as('employee').post('/time-entries', entry(d.Pb));
    assert.deepEqual([foreignProject.status, foreignProject.body.code, foreignProject.body.field], [400, 'INVALID_REFERENCE', 'projectId']);
    const foreignTask = await as('employee').post('/time-entries', entry(d.P, { taskId: d.tB }));
    assert.deepEqual([foreignTask.status, foreignTask.body.field], [400, 'taskId']);
    assert.equal(await prisma.timeEntry.count({ where: { projectId: d.Pb } }), 0);
  });

  it('a contractor logs time only on assigned work', async () => {
    assert.equal((await as('contractor').post('/time-entries', entry(d.P))).status, 201, 'member project');
    assert.equal((await as('contractor').post('/time-entries', entry(d.Q, { taskId: d.tQ }))).status, 201, 'assigned task');
    assert.equal((await as('contractor').post('/time-entries', entry(d.Q))).status, 403, 'assigned-task project without the task');
    assert.equal((await as('contractor').post('/time-entries', entry(d.R, { taskId: d.tR }))).status, 403, 'unassigned');
  });

  it('CLIENT has no access at all', async () => {
    assert.equal((await as('client').get('/time-entries')).status, 403);
    assert.equal((await as('client').post('/time-entries', entry(d.P))).status, 403);
    assert.equal((await as('client').get(`/time-entries/${d.empEntry}`)).status, 403);
    assert.equal((await as('client').post(`/time-entries/${d.empEntry}/approve`, {})).status, 403);
  });
});

describe('time entries: reading (MAOS-T72)', { skip }, () => {
  it('members see their own entries only; OWNER and MANAGER see all', async () => {
    const m = await as('manager').post('/time-entries', entry(d.R, { minutes: 15 }));
    assert.equal(m.status, 201);
    d.mgrEntry = m.body.id;
    const mine = await as('employee').get('/time-entries');
    assert.equal(mine.status, 200);
    assert.ok(mine.body.length > 0 && mine.body.every((e) => e.user.id === people.employee.id));
    assert.equal((await as('employee').get(`/time-entries/${d.mgrEntry}`)).status, 404);
    assert.equal((await as('employee').get(`/time-entries?userId=${people.manager.id}`)).status, 403);
    const all = await as('manager').get('/time-entries');
    assert.ok(all.body.some((e) => e.id === d.empEntry) && all.body.some((e) => e.id === d.mgrEntry));
    const filtered = await as('owner').get(`/time-entries?userId=${people.employee.id}&from=2026-10-16&to=2026-10-16`);
    assert.ok(filtered.body.length > 0 && filtered.body.every((e) => e.user.id === people.employee.id));
    assert.equal((await as('owner').get('/time-entries?status=DONE')).status, 400);
    assert.equal((await as('owner').get('/time-entries?from=2026-13-01')).status, 400);
  });

  it('rate and cost reach the OWNER only', async () => {
    // A frozen rate as T73 will write it (1 minute x 3000 cents/h = 50 cents).
    const rated = await prisma.timeEntry.create({
      data: { tenantId: t.a.id, userId: people.employee.id, projectId: d.P, date: new Date('2026-10-15'), minutes: 1, rateCents: 3000, rateSource: 'TENANT', currency: 'EUR', costCents: 50 },
    });
    d.rated = rated.id;
    const owner = await as('owner').get(`/time-entries/${rated.id}`);
    assert.deepEqual([owner.body.rateCents, owner.body.costCents, owner.body.rateSource, owner.body.currency], [3000, 50, 'TENANT', 'EUR']);
    for (const who of ['manager', 'employee']) {
      const one = await as(who).get(`/time-entries/${rated.id}`);
      assert.equal(one.status, 200);
      assert.deepEqual(rateKeysIn(one.body), [], who);
      assert.deepEqual(rateKeysIn((await as(who).get('/time-entries')).body), [], `${who} list`);
    }
  });

  it('another tenant sees nothing and cannot address these ids', async () => {
    assert.equal((await as('foreign').get(`/time-entries/${d.empEntry}`)).status, 404);
    assert.ok(!(await as('foreign').get('/time-entries')).body.some((e) => e.id === d.empEntry));
    assert.equal((await as('foreign').patch(`/time-entries/${d.empEntry}`, { minutes: 5 })).status, 404);
    assert.equal((await as('foreign').post(`/time-entries/${d.empEntry}/approve`, {})).status, 404);
    assert.equal((await as('foreign').del(`/time-entries/${d.empEntry}`)).status, 404);
  });
});

describe('time entries: changes and review (MAOS-T72)', { skip }, () => {
  it('only the member edits their own draft; moving project re-checks the task and the customer', async () => {
    assert.equal((await as('employee').patch(`/time-entries/${d.empEntry}`, { minutes: 45, billable: false })).status, 200);
    assert.equal((await as('manager').patch(`/time-entries/${d.empEntry}`, { minutes: 5 })).status, 403);
    const stale = await as('employee').patch(`/time-entries/${d.empEntry}`, { projectId: d.R });
    assert.deepEqual([stale.status, stale.body.code], [400, 'TASK_NOT_IN_PROJECT'], 'old task does not belong to the new project');
    const moved = await as('employee').patch(`/time-entries/${d.empEntry}`, { projectId: d.R, taskId: null });
    assert.equal(moved.status, 200, JSON.stringify(moved.body));
    assert.deepEqual([moved.body.projectId, moved.body.taskId, moved.body.customerId, moved.body.minutes, moved.body.billable], [d.R, null, null, 45, false]);
    assert.equal((await as('employee').patch(`/time-entries/${d.empEntry}`, { projectId: d.Pb })).status, 400);
  });

  it('submit -> approve; locked afterwards; conflicts answer 409', async () => {
    assert.equal((await as('employee').post(`/time-entries/${d.empEntry}/submit`, {})).body.status, 'SUBMITTED');
    assert.equal((await as('employee').post(`/time-entries/${d.empEntry}/submit`, {})).status, 409);
    const locked = await as('employee').patch(`/time-entries/${d.empEntry}`, { minutes: 10 });
    assert.deepEqual([locked.status, locked.body.code], [409, 'TIME_ENTRY_LOCKED']);
    assert.equal((await as('employee').post(`/time-entries/${d.empEntry}/approve`, {})).status, 403, 'members do not approve');
    assert.equal((await as('contractor').post(`/time-entries/${d.empEntry}/approve`, {})).status, 403);
    const ok = await as('manager').post(`/time-entries/${d.empEntry}/approve`, {});
    assert.deepEqual([ok.status, ok.body.status], [200, 'APPROVED']);
    assert.equal((await as('manager').post(`/time-entries/${d.empEntry}/approve`, {})).status, 409);
    assert.equal((await as('manager').post(`/time-entries/${d.empEntry}/reject`, {})).status, 409);
    assert.equal((await as('employee').patch(`/time-entries/${d.empEntry}`, { minutes: 10 })).status, 409);
    assert.equal((await as('employee').del(`/time-entries/${d.empEntry}`)).status, 409);
    assert.ok(await prisma.timeEntry.findUnique({ where: { id: d.empEntry } }));
    for (const action of ['time_entry.submitted', 'time_entry.approved']) {
      assert.ok(await prisma.auditEvent.findFirst({ where: { resourceId: d.empEntry, action } }), action);
    }
  });

  it('reject returns the entry to its member; editing it makes it a draft again', async () => {
    const e = (await as('employee').post('/time-entries', entry(d.P, { minutes: 20 }))).body.id;
    assert.equal((await as('manager').post(`/time-entries/${e}/reject`, {})).status, 409, 'only submitted entries');
    await as('employee').post(`/time-entries/${e}/submit`, {});
    const rejected = await as('owner').post(`/time-entries/${e}/reject`, { reason: 'wrong project' });
    assert.deepEqual([rejected.status, rejected.body.status], [200, 'REJECTED']);
    const ev = await prisma.auditEvent.findFirst({ where: { resourceId: e, action: 'time_entry.rejected' } });
    assert.ok(ev);
    const edited = await as('employee').patch(`/time-entries/${e}`, { minutes: 25 });
    assert.deepEqual([edited.status, edited.body.status, edited.body.minutes], [200, 'DRAFT', 25]);
  });

  it('members delete their own drafts only', async () => {
    const e = (await as('employee').post('/time-entries', entry(d.P, { minutes: 5 }))).body.id;
    assert.equal((await as('manager').del(`/time-entries/${e}`)).status, 403);
    assert.equal((await as('contractor').del(`/time-entries/${e}`)).status, 404);
    assert.equal((await as('employee').del(`/time-entries/${e}`)).status, 204);
    assert.equal(await prisma.timeEntry.count({ where: { id: e } }), 0);
    assert.ok(await prisma.auditEvent.findFirst({ where: { resourceId: e, action: 'time_entry.deleted' } }));
  });
});

describe('time entries: database rules surface safely (MAOS-T72)', { skip }, () => {
  it('editing minutes of a rated entry that would break the frozen cost answers 400, not 500', async () => {
    const res = await as('employee').patch(`/time-entries/${d.rated}`, { minutes: 60 });
    assert.deepEqual([res.status, res.body.code], [400, 'TIME_ENTRY_INVALID']);
    assert.equal((await prisma.timeEntry.findUnique({ where: { id: d.rated } })).minutes, 1, 'unchanged');
  });

  it('a project with logged time cannot be deleted (409); one without can', async () => {
    const res = await as('owner').del(`/projects/${d.P}`);
    assert.deepEqual([res.status, res.body.code], [409, 'PROJECT_HAS_TIME_ENTRIES']);
    assert.ok(await prisma.project.findUnique({ where: { id: d.P } }));
    const empty = await prisma.project.create({ data: { tenantId: t.a.id, name: `Empty ${RUN}` }, select: { id: true } });
    assert.ok([200, 204].includes((await as('owner').del(`/projects/${empty.id}`)).status));
  });
});
