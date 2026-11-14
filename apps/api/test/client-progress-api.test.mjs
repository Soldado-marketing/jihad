/**
 * D08 — project status for the client portal: GET /api/client/progress.
 *
 * Proven here over HTTP against a real database:
 *   - a client receives its own shared projects with the number of shared
 *     work steps per stage, and nothing else about any task;
 *   - a blockage counts as in progress; archived tasks and appointments are
 *     not counted; unshared tasks and unshared projects do not appear;
 *   - another client, another company and a client without a scope get nothing;
 *   - staff: OWNER and MANAGER preview everything shared, EMPLOYEE and
 *     CONTRACTOR are refused, anonymous is 401;
 *   - a client whose task access was withdrawn gets the projects without numbers.
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
  : !existsSync(join(apiRoot, 'dist/modules/client-portal/client-progress.service.js'))
    ? 'run `npm run build` first'
    : !(process.env.DATABASE_URL && process.env.JWT_SECRET)
      ? 'DATABASE_URL and JWT_SECRET must be set'
      : false;

const RUN = `cp${Date.now().toString(36)}`;
const PASSWORD = 'ProgressPass123!';
const SECRET_TITLE = `SECRET-TITLE-${RUN}`;
const SECRET_NOTE = `SECRET-NOTE-${RUN}`;
const ALLOWED_PROJECT_KEYS = ['id', 'name', 'status', 'steps'];
const ALLOWED_STEP_KEYS = ['done', 'inProgress', 'inReview', 'planned', 'total'];

let app; let server; let request; let prisma;
const t = {}; const people = {}; const d = {};

const progress = (who) => request(server).get('/api/client/progress').set('Authorization', `Bearer ${people[who].token}`);
const byId = (body, id) => body.find((p) => p.id === id);

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
    const user = await prisma.user.create({ data: { email, displayName: `Person ${label} ${RUN}`, passwordHash: hash, status: 'APPROVED' }, select: { id: true } });
    const m = await prisma.tenantMembership.create({
      data: { tenantId: t[tenant].id, userId: user.id, role, status: 'ACTIVE', visibilityScope: clientScopeKey ? 'CLIENT_LEVEL' : 'TENANT_WIDE', clientScopeKey: clientScopeKey ?? null },
      select: { id: true },
    });
    const res = await request(server).post('/api/auth/login').set('X-Forwarded-For', `198.51.100.${++ip}`).send({ email, passwordOrMagicCode: PASSWORD, tenantSlug: `t${tenant}-${RUN}` });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return { id: user.id, membershipId: m.id, token: res.body.tokens.accessToken };
  }
  const k1 = `pg-one-${RUN}`; const k2 = `pg-two-${RUN}`;
  people.owner = await member('a', 'owner', 'OWNER');
  people.manager = await member('a', 'manager', 'MANAGER');
  people.employee = await member('a', 'employee', 'EMPLOYEE');
  people.contractor = await member('a', 'contractor', 'CONTRACTOR');
  people.clientA = await member('a', 'client-a', 'CLIENT', k1);
  people.clientB = await member('a', 'client-b', 'CLIENT', k2);
  people.limited = await member('a', 'limited', 'CLIENT', k1);
  people.foreign = await member('b', 'foreign', 'CLIENT', k1);
  // A CLIENT membership without a key cannot be made through the product; written directly for the fail-closed case.
  people.noscope = await member('a', 'noscope', 'CLIENT');
  // The limited client's task access is withdrawn by the company.
  await prisma.membershipPermission.create({ data: { membershipId: people.limited.membershipId, action: 'read', resource: 'task', granted: false } });

  const A = t.a.id; const B = t.b.id;
  const row = async (model, data) => (await prisma[model].create({ data, select: { id: true } })).id;
  const project = (tenantId, name, key, extra = {}) => row('project', { tenantId, name: `${name} ${RUN}`, clientScopeKey: key, clientVisible: true, ...extra });
  d.p1 = await project(A, 'Shared one', k1);
  d.pEmpty = await project(A, 'Shared empty', k1, { status: 'PAUSED' });
  d.pHidden = await project(A, 'Hidden one', k1, { clientVisible: false });
  d.p2 = await project(A, 'Other client', k2);
  d.pb = await project(B, 'Other company', k1);

  let n = 0;
  const task = (tenantId, projectId, key, status, extra = {}) => row('task', {
    tenantId, projectId, clientScopeKey: key, clientVisible: true, status,
    title: `${SECRET_TITLE} ${++n}`, description: SECRET_NOTE, assignedToUserId: tenantId === A ? people.employee.id : null, dueAt: new Date(Date.now() + 86400000), priority: 'HIGH',
    ...extra,
  });
  // Project one: 2 planned, 1 in progress + 1 blocked, 1 in review, 3 done = 8 counted.
  for (const s of ['TODO', 'TODO', 'IN_PROGRESS', 'BLOCKED', 'IN_REVIEW', 'DONE', 'DONE', 'DONE']) await task(A, d.p1, k1, s);
  // Not counted: archived, not shared, shared with the other client's key, an appointment, a task without a project.
  await task(A, d.p1, k1, 'ARCHIVED');
  await task(A, d.p1, k1, 'DONE', { clientVisible: false });
  await task(A, d.p1, k2, 'DONE');
  d.shoot = await task(A, d.p1, k1, 'TODO');
  const label = await row('label', { tenantId: A, name: 'Shooting appointment' });
  await prisma.taskLabel.create({ data: { taskId: d.shoot, labelId: label, tenantId: A } });
  await task(A, null, k1, 'DONE');
  // A hidden project's shared tasks stay out; the other client and the other company have their own numbers.
  await task(A, d.pHidden, k1, 'DONE');
  for (const s of ['TODO', 'DONE']) await task(A, d.p2, k2, s);
  for (const s of ['DONE', 'DONE', 'DONE', 'DONE']) await task(B, d.pb, k1, s);
});

after(async () => {
  if (app) await app.close();
});

describe('D08 — client project status', { skip }, () => {
  it('a client receives its shared projects with the numbers per stage', async () => {
    const res = await progress('clientA');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(res.body.map((p) => p.id).sort(), [d.p1, d.pEmpty].sort());
    assert.deepEqual(byId(res.body, d.p1), {
      id: d.p1, name: `Shared one ${RUN}`, status: 'ACTIVE',
      steps: { total: 8, planned: 2, inProgress: 2, inReview: 1, done: 3 },
    });
  });

  it('a shared project without shared work has zeros, and keeps its own state', async () => {
    const res = await progress('clientA');
    assert.deepEqual(byId(res.body, d.pEmpty), {
      id: d.pEmpty, name: `Shared empty ${RUN}`, status: 'PAUSED',
      steps: { total: 0, planned: 0, inProgress: 0, inReview: 0, done: 0 },
    });
  });

  it('numbers only: no task field of any kind is in the answer', async () => {
    const res = await progress('clientA');
    for (const p of res.body) {
      assert.deepEqual(Object.keys(p).sort(), ALLOWED_PROJECT_KEYS);
      assert.deepEqual(Object.keys(p.steps).sort(), ALLOWED_STEP_KEYS);
      for (const v of Object.values(p.steps)) assert.equal(Number.isInteger(v), true);
    }
    const text = JSON.stringify(res.body);
    for (const leak of [SECRET_TITLE, SECRET_NOTE, people.employee.id, 'BLOCKED', 'ARCHIVED', 'Shooting appointment', 'assignedTo', 'dueAt', 'priority', 'description', 'title', 'clientScopeKey']) {
      assert.ok(!text.includes(leak), `the answer contains ${leak}`);
    }
  });

  it('an unshared project is absent, also when it has shared tasks', async () => {
    const res = await progress('clientA');
    assert.equal(byId(res.body, d.pHidden), undefined);
    assert.ok(!JSON.stringify(res.body).includes('Hidden one'));
  });

  it('client B receives only its own project and numbers', async () => {
    const res = await progress('clientB');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, [{ id: d.p2, name: `Other client ${RUN}`, status: 'ACTIVE', steps: { total: 2, planned: 1, inProgress: 0, inReview: 0, done: 1 } }]);
    const a = JSON.stringify((await progress('clientA')).body);
    assert.ok(!a.includes(d.p2) && !a.includes('Other client'), 'client A received client B');
  });

  it('another company with the same scope key receives only its own rows', async () => {
    const res = await progress('foreign');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, [{ id: d.pb, name: `Other company ${RUN}`, status: 'ACTIVE', steps: { total: 4, planned: 0, inProgress: 0, inReview: 0, done: 4 } }]);
    assert.ok(!JSON.stringify((await progress('clientA')).body).includes(d.pb));
  });

  it('a client without a scope is refused and receives no row', async () => {
    const res = await progress('noscope');
    assert.equal(res.status, 403, JSON.stringify(res.body));
    assert.match(JSON.stringify(res.body), /client_scope_missing/);
    assert.ok(!JSON.stringify(res.body).includes(RUN));
  });

  it('a client whose task access was withdrawn receives the projects without numbers', async () => {
    const res = await progress('limited');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(res.body.map((p) => p.id).sort(), [d.p1, d.pEmpty].sort());
    for (const p of res.body) assert.equal(p.steps, null);
  });

  it('anonymous is 401; EMPLOYEE and CONTRACTOR are refused as on every portal route', async () => {
    assert.equal((await request(server).get('/api/client/progress')).status, 401);
    for (const who of ['employee', 'contractor']) {
      const res = await progress(who);
      assert.equal(res.status, 403, `${who}: ${JSON.stringify(res.body)}`);
      assert.ok(!JSON.stringify(res.body).includes(RUN));
    }
  });

  it('OWNER and MANAGER preview every shared project of their company, never another company', async () => {
    for (const who of ['owner', 'manager']) {
      const res = await progress(who);
      assert.equal(res.status, 200, `${who}: ${JSON.stringify(res.body)}`);
      assert.deepEqual(res.body.map((p) => p.id).sort(), [d.p1, d.pEmpty, d.p2].sort());
      // Without a client filter the task shared under the other key in project one is counted too.
      assert.deepEqual(byId(res.body, d.p1).steps, { total: 9, planned: 2, inProgress: 2, inReview: 1, done: 4 });
      assert.ok(!JSON.stringify(res.body).includes(SECRET_TITLE));
    }
  });

  it('the route only reads: POST, PATCH and DELETE do not exist, and no row changed', async () => {
    const before = await prisma.task.count({ where: { tenantId: { in: [t.a.id, t.b.id] } } });
    for (const verb of ['post', 'patch', 'delete']) {
      const res = await request(server)[verb]('/api/client/progress').set('Authorization', `Bearer ${people.clientA.token}`);
      assert.equal(res.status, 404, `${verb}: ${res.status}`);
    }
    await progress('clientA');
    assert.equal(await prisma.task.count({ where: { tenantId: { in: [t.a.id, t.b.id] } } }), before);
  });

  it('answers are not cached', async () => {
    const res = await progress('clientA');
    assert.match(res.headers['cache-control'] ?? '', /no-store/);
  });
});
