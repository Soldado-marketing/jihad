/**
 * G10 - bulk actions on tasks, at the routes the list view calls.
 *
 * A bulk action in the web app is the single-task request, once per selected
 * task. This suite drives those requests for twenty tasks over real HTTP and
 * proves what the task asks for:
 *   - status, assignee, project ("move") and label are stored on all twenty;
 *   - every task gets its own audit record with the person who did it;
 *   - a new assignee is told once per task;
 *   - a change that changes nothing is not recorded again;
 *   - someone limited to their own tasks cannot change a task they may not
 *     see, by any of the four actions - the label routes included - and
 *     nothing is stored or recorded; another company's task is out of reach.
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
const RUN = 'tb' + Date.now().toString(36);
const PASSWORD = 'TaskBulkActionsTest123!';
const COUNT = 20;

let app, server, request, prisma;
const co = {};
const p = {};
const t = {};
const project = {};
const label = {};
let twenty = [];
let hidden, foreign;
let address = 0;

async function member(tenant, role, name) {
  const bcrypt = require('bcrypt');
  const user = await prisma.user.create({
    data: { email: `${name}-${RUN}@example.test`, displayName: `${name} ${RUN}`, passwordHash: await bcrypt.hash(PASSWORD, 10), status: 'APPROVED' },
  });
  await prisma.tenantMembership.create({ data: { tenantId: tenant.id, userId: user.id, role, status: 'ACTIVE' } });
  return { id: user.id, email: user.email };
}
/** Each sign-in comes from its own address: the sign-in limit stays in force and is not what this suite measures. */
async function login(person, tenant) {
  const res = await request(server).post('/api/auth/login')
    .set('X-Forwarded-For', `10.10.${Math.floor(address / 250)}.${(address++ % 250) + 1}`)
    .send({ email: person.email, passwordOrMagicCode: PASSWORD, tenantSlug: tenant.slug });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.tokens.accessToken;
}
const as = (token, req) => req.set('Authorization', `Bearer ${token}`);
const patch = (token, id, body) => as(token, request(server).patch(`/api/tasks/${id}`)).send(body);
const addLabel = (token, id, labelId) => as(token, request(server).post(`/api/tasks/${id}/labels/${labelId}`));
const dropLabel = (token, id, labelId) => as(token, request(server).delete(`/api/tasks/${id}/labels/${labelId}`));
const events = (ids, action) => prisma.auditEvent.findMany({ where: { resourceType: 'task', resourceId: { in: ids }, action } });
const eventsOn = (id) => prisma.auditEvent.count({ where: { resourceType: 'task', resourceId: id } });
const ids = () => twenty.map((x) => x.id);
/** Exactly one record per task, each by the same person. */
function assertOnePerTask(rows, actorId, what) {
  assert.equal(rows.length, COUNT, `${what}: ${COUNT} records`);
  assert.deepEqual([...new Set(rows.map((e) => e.resourceId))].sort(), ids().sort(), `${what}: one per task`);
  assert.ok(rows.every((e) => e.actorId === actorId && e.tenantId === co.a.id && e.outcome === 'SUCCESS'), `${what}: by the person who did it`);
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
  app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  await app.init();
  await app.listen(0, '127.0.0.1');
  server = app.getHttpServer();
  request = require('supertest');
  const { PrismaService } = require(join(apiRoot, 'dist/modules/prisma/prisma.service.js'));
  prisma = app.get(PrismaService);

  for (const k of ['a', 'b']) co[k] = await prisma.tenant.create({ data: { name: `TB ${k} ${RUN}`, slug: `${RUN}-${k}`, status: 'ACTIVE' } });
  p.manager = await member(co.a, 'MANAGER', 'manager');
  p.assignee = await member(co.a, 'EMPLOYEE', 'assignee');
  p.limited = await member(co.a, 'EMPLOYEE', 'limited');
  p.contractor = await member(co.a, 'CONTRACTOR', 'contractor');
  p.ownerB = await member(co.b, 'OWNER', 'ownerb');

  project.from = await prisma.project.create({ data: { tenantId: co.a.id, name: `From ${RUN}`, status: 'ACTIVE' } });
  project.to = await prisma.project.create({ data: { tenantId: co.a.id, name: `To ${RUN}`, status: 'ACTIVE' } });
  label.one = await prisma.label.create({ data: { tenantId: co.a.id, name: `urgent-${RUN}`, color: '#ef4444' } });
  label.foreign = await prisma.label.create({ data: { tenantId: co.b.id, name: `theirs-${RUN}`, color: '#22c55e' } });
  for (let i = 0; i < COUNT; i++) {
    twenty.push(await prisma.task.create({ data: { tenantId: co.a.id, projectId: project.from.id, title: `Bulk ${String(i + 1).padStart(2, '0')} ${RUN}`, status: 'TODO' } }));
  }
  // A task the limited employee and the contractor may not see, and one of another company.
  hidden = await prisma.task.create({ data: { tenantId: co.a.id, title: `Hidden ${RUN}`, status: 'TODO' } });
  foreign = await prisma.task.create({ data: { tenantId: co.b.id, title: `Foreign ${RUN}`, status: 'TODO' } });

  for (const [k, who, tenant] of [['manager', p.manager, co.a], ['limited', p.limited, co.a], ['contractor', p.contractor, co.a], ['ownerB', p.ownerB, co.b]]) {
    t[k] = await login(who, tenant);
  }
});
after(async () => { if (app) await app.close(); });

describe('G10 - twenty tasks, one action: stored on every task and recorded per task', { skip }, () => {
  it('status: all twenty carry the new status, each with its own record', async () => {
    for (const id of ids()) assert.equal((await patch(t.manager, id, { status: 'IN_PROGRESS' })).status, 200);
    const rows = await prisma.task.findMany({ where: { id: { in: ids() } }, select: { status: true } });
    assert.ok(rows.every((r) => r.status === 'IN_PROGRESS'));
    const recorded = await events(ids(), 'task.status.changed');
    assertOnePerTask(recorded, p.manager.id, 'status');
    assert.ok(recorded.every((e) => e.redactedPayload?.from === 'TODO' && e.redactedPayload?.to === 'IN_PROGRESS'));
  });

  it('assign: all twenty belong to the member, each recorded, and the member is told once per task', async () => {
    for (const id of ids()) assert.equal((await patch(t.manager, id, { assignedToUserId: p.assignee.id })).status, 200);
    const rows = await prisma.task.findMany({ where: { id: { in: ids() } }, select: { assignedToUserId: true } });
    assert.ok(rows.every((r) => r.assignedToUserId === p.assignee.id));
    assertOnePerTask(await events(ids(), 'task.assigned'), p.manager.id, 'assign');
    const notices = await prisma.notification.findMany({ where: { recipientUserId: p.assignee.id, resourceType: 'task', resourceId: { in: ids() }, title: 'Task assigned to you' } });
    assert.equal(notices.length, COUNT);
    assert.equal(new Set(notices.map((n) => n.resourceId)).size, COUNT, 'one notice per task');
  });

  it('move: all twenty are in the other project, each with its own record of the project change', async () => {
    for (const id of ids()) assert.equal((await patch(t.manager, id, { projectId: project.to.id })).status, 200);
    const rows = await prisma.task.findMany({ where: { id: { in: ids() } }, select: { projectId: true } });
    assert.ok(rows.every((r) => r.projectId === project.to.id), 'the move persists');
    const recorded = (await events(ids(), 'task.updated')).filter((e) => JSON.stringify(e.redactedPayload?.fields) === '["projectId"]');
    assertOnePerTask(recorded, p.manager.id, 'move');
  });

  it('label: all twenty carry the label, each with its own record', async () => {
    for (const id of ids()) assert.ok([200, 201].includes((await addLabel(t.manager, id, label.one.id)).status));
    assert.equal(await prisma.taskLabel.count({ where: { taskId: { in: ids() }, labelId: label.one.id } }), COUNT);
    const recorded = await events(ids(), 'task.label.added');
    assertOnePerTask(recorded, p.manager.id, 'label');
    assert.ok(recorded.every((e) => e.redactedPayload?.labelId === label.one.id));
  });

  it('a change that changes nothing is not recorded again', async () => {
    const one = ids()[0];
    const before = await eventsOn(one);
    assert.ok([200, 201].includes((await addLabel(t.manager, one, label.one.id)).status), 'adding the same label again is accepted');
    assert.equal((await patch(t.manager, one, { status: 'IN_PROGRESS' })).status, 200);
    assert.equal((await patch(t.manager, one, { assignedToUserId: p.assignee.id })).status, 200);
    assert.equal(await eventsOn(one), before, 'no new record for the same label, the same status or the same assignee');
    assert.equal(await prisma.taskLabel.count({ where: { taskId: one, labelId: label.one.id } }), 1);
    assert.equal(await prisma.notification.count({ where: { recipientUserId: p.assignee.id, resourceId: one, title: 'Task assigned to you' } }), 1);
  });

  it('removing the label again is recorded once per task, and a second removal records nothing', async () => {
    const one = ids()[1];
    assert.equal((await dropLabel(t.manager, one, label.one.id)).status, 204);
    assert.equal((await dropLabel(t.manager, one, label.one.id)).status, 204);
    assert.equal(await prisma.taskLabel.count({ where: { taskId: one, labelId: label.one.id } }), 0);
    assert.equal((await events([one], 'task.label.removed')).length, 1);
  });
});

describe('G10 - scope is respected by every one of the four actions', { skip }, () => {
  for (const who of ['limited', 'contractor']) {
    it(`${who}: a task they may not see cannot be changed, labelled or moved, and nothing is recorded`, async () => {
      const [eventsBefore, labelsBefore] = [await eventsOn(hidden.id), await prisma.taskLabel.count({ where: { taskId: hidden.id } })];
      assert.equal((await patch(t[who], hidden.id, { status: 'DONE' })).status, 404);
      assert.equal((await patch(t[who], hidden.id, { assignedToUserId: p[who].id })).status, 404);
      assert.equal((await patch(t[who], hidden.id, { projectId: project.to.id })).status, 404);
      assert.equal((await addLabel(t[who], hidden.id, label.one.id)).status, 404, 'the label route follows the task scope');
      assert.equal((await dropLabel(t[who], hidden.id, label.one.id)).status, 404);
      const row = await prisma.task.findUnique({ where: { id: hidden.id }, select: { status: true, assignedToUserId: true, projectId: true } });
      assert.deepEqual(row, { status: 'TODO', assignedToUserId: null, projectId: null });
      assert.equal(await prisma.taskLabel.count({ where: { taskId: hidden.id } }), labelsBefore);
      assert.equal(await eventsOn(hidden.id), eventsBefore);
    });
  }

  it('the same person changes and labels a task that is theirs (control)', async () => {
    const own = await prisma.task.create({ data: { tenantId: co.a.id, title: `Own ${RUN}`, status: 'TODO', assignedToUserId: p.limited.id } });
    assert.equal((await patch(t.limited, own.id, { status: 'IN_REVIEW' })).status, 200);
    assert.ok([200, 201].includes((await addLabel(t.limited, own.id, label.one.id)).status));
    assert.equal((await events([own.id], 'task.label.added'))[0].actorId, p.limited.id);
    assert.equal((await dropLabel(t.limited, own.id, label.one.id)).status, 204);
  });

  it('another company: its task and its label are out of reach, in both directions', async () => {
    const before = await eventsOn(foreign.id);
    assert.equal((await patch(t.manager, foreign.id, { status: 'DONE' })).status, 404);
    assert.equal((await addLabel(t.manager, foreign.id, label.one.id)).status, 404);
    assert.equal((await addLabel(t.manager, ids()[2], label.foreign.id)).status, 404, 'another company\'s label on our task');
    assert.equal((await addLabel(t.ownerB, ids()[2], label.foreign.id)).status, 404, 'their owner on our task');
    assert.equal((await patch(t.manager, ids()[2], { projectId: (await prisma.project.create({ data: { tenantId: co.b.id, name: `Theirs ${RUN}`, status: 'ACTIVE' } })).id })).status, 400, 'a move into another company\'s project');
    assert.equal((await prisma.task.findUnique({ where: { id: foreign.id } })).status, 'TODO');
    assert.equal(await prisma.taskLabel.count({ where: { OR: [{ taskId: foreign.id }, { labelId: label.foreign.id }] } }), 0);
    assert.equal(await eventsOn(foreign.id), before);
    assert.equal((await prisma.task.findUnique({ where: { id: ids()[2] } })).projectId, project.to.id);
  });
});
