/**
 * G07 - task comments with mentions, as one named gate.
 *
 * A note on a task is that task's comment thread. This suite drives the real
 * app over HTTP and proves what the task asks for:
 *   - the thread persists and keeps its order;
 *   - a mention notifies the member once, names the task, never carries the text;
 *   - only people who may read the thread can be mentioned;
 *   - a CLIENT and a CONTRACTOR never read or write comments;
 *   - an EMPLOYEE who may not see a task reaches none of its comments, on any route;
 *   - another company's task and comments stay out of reach;
 *   - only the author changes a comment; the author, an OWNER or a MANAGER removes it;
 *   - a deleted task takes its comments with it.
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
const RUN = 'tc' + Date.now().toString(36);
const PASSWORD = 'TaskCommentsTest123!';
const MENTION_TITLE = 'You were mentioned in a task comment';

let app, server, request, prisma;
const co = {};
const p = {};
const t = {};
const task = {};
let address = 0;

async function member(tenant, role, label) {
  const bcrypt = require('bcrypt');
  const user = await prisma.user.create({
    data: { email: `${label}-${RUN}@example.test`, displayName: `${label} ${RUN}`, passwordHash: await bcrypt.hash(PASSWORD, 10), status: 'APPROVED' },
  });
  await prisma.tenantMembership.create({
    data: { tenantId: tenant.id, userId: user.id, role, status: 'ACTIVE', ...(role === 'CLIENT' ? { clientScopeKey: `cust-${tenant.slug}` } : {}) },
  });
  return { id: user.id, email: user.email, name: user.displayName };
}
/** Each sign-in comes from its own address: the sign-in limit stays in force and is not what this suite measures. */
async function login(person, tenant) {
  const res = await request(server).post('/api/auth/login')
    .set('X-Forwarded-For', `10.9.${Math.floor(address / 250)}.${(address++ % 250) + 1}`)
    .send({ email: person.email, passwordOrMagicCode: PASSWORD, tenantSlug: tenant.slug });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.tokens.accessToken;
}
const as = (token, req) => req.set('Authorization', `Bearer ${token}`);
const notes = '/api/collaboration/notes';
const list = (token, taskId) => as(token, request(server).get(`${notes}?resourceType=task&resourceId=${taskId}`));
const comment = (token, taskId, body) => as(token, request(server).post(notes)).send({ body, resourceType: 'task', resourceId: taskId });
const edit = (token, id, body) => as(token, request(server).patch(`${notes}/${id}`)).send({ body });
const remove = (token, id) => as(token, request(server).delete(`${notes}/${id}`));
const remove2 = (token, taskId) => as(token, request(server).delete(`/api/tasks/${taskId}`));
const mentionable = (token, taskId) => as(token, request(server).get(`${notes}/mentionable?resourceType=task&resourceId=${taskId}`));
const at = (person, shown = person.name) => `@[${shown}](user:${person.id})`;
const notices = (userId, taskId) => prisma.notification.findMany({ where: { recipientUserId: userId, resourceType: 'task', resourceId: taskId, title: MENTION_TITLE } });
const stored = (taskId) => prisma.internalNote.count({ where: { resourceType: 'task', resourceId: taskId } });
const allNotices = () => prisma.notification.count({ where: { tenantId: { in: [co.a.id, co.b.id] }, title: MENTION_TITLE } });

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
    co[k] = await prisma.tenant.create({ data: { name: `TC ${k} ${RUN}`, slug: `${RUN}-${k}`, status: 'ACTIVE' } });
    await prisma.customer.create({ data: { tenantId: co[k].id, name: `Customer ${k} ${RUN}`, clientScopeKey: `cust-${co[k].slug}`, status: 'ACTIVE' } });
  }
  p.owner = await member(co.a, 'OWNER', 'owner');
  p.manager = await member(co.a, 'MANAGER', 'manager');
  p.assignee = await member(co.a, 'EMPLOYEE', 'assignee');
  p.other = await member(co.a, 'EMPLOYEE', 'other');
  p.contractor = await member(co.a, 'CONTRACTOR', 'contractor');
  p.client = await member(co.a, 'CLIENT', 'client');
  p.ownerB = await member(co.b, 'OWNER', 'ownerb');

  // A project shared with the client, so the client's portal really has this work in reach.
  const project = await prisma.project.create({ data: { tenantId: co.a.id, name: `Project ${RUN}`, status: 'ACTIVE', clientScopeKey: `cust-${co.a.slug}` } });
  task.mine = await prisma.task.create({ data: { tenantId: co.a.id, projectId: project.id, title: `Film cut ${RUN}`, assignedToUserId: p.assignee.id, clientScopeKey: `cust-${co.a.slug}`, clientVisible: true } });
  // Assigned to the contractor: they see the task, and still not its internal comments.
  task.contracted = await prisma.task.create({ data: { tenantId: co.a.id, title: `Sound mix ${RUN}`, assignedToUserId: p.contractor.id } });
  task.unassigned = await prisma.task.create({ data: { tenantId: co.a.id, title: `Budget talk ${RUN}` } });
  task.foreign = await prisma.task.create({ data: { tenantId: co.b.id, title: `Other company ${RUN}` } });

  for (const [k, who, tenant] of [['owner', p.owner, co.a], ['manager', p.manager, co.a], ['assignee', p.assignee, co.a], ['other', p.other, co.a],
    ['contractor', p.contractor, co.a], ['client', p.client, co.a], ['ownerB', p.ownerB, co.b]]) {
    t[k] = await login(who, tenant);
  }
});
after(async () => { if (app) await app.close(); });

describe('G07 - the thread persists and a mention notifies the member', { skip }, () => {
  let first;

  it('comments of a task are stored, read back in order, with their author and the people they mention', async () => {
    const a = await comment(t.owner, task.mine.id, `Please check the colours, ${at(p.assignee)}.`);
    assert.equal(a.status, 201, JSON.stringify(a.body));
    first = a.body;
    assert.equal(first.createdBy.id, p.owner.id);
    assert.deepEqual(first.mentions, [{ id: p.assignee.id, displayName: p.assignee.name }]);
    const b = await comment(t.assignee, task.mine.id, 'Done, second pass is uploaded.');
    assert.equal(b.status, 201, JSON.stringify(b.body));
    assert.deepEqual(b.body.mentions, []);

    const thread = await list(t.manager, task.mine.id);
    assert.equal(thread.status, 200);
    assert.deepEqual(thread.body.map((n) => n.id), [b.body.id, first.id], 'newest first, as the notes list always answered');
    assert.equal(thread.body[1].body, `Please check the colours, ${at(p.assignee)}.`);
    assert.equal(thread.body[1].createdBy.displayName, p.owner.name);
    assert.deepEqual(thread.body[1].mentions, [{ id: p.assignee.id, displayName: p.assignee.name }]);
    assert.equal(await prisma.internalNote.count({ where: { tenantId: co.a.id, resourceType: 'task', resourceId: task.mine.id } }), 2, 'in the database, on the task');
  });

  it('the mentioned member gets one notice that names the task and does not carry the comment', async () => {
    const rows = await notices(p.assignee.id, task.mine.id);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].tenantId, co.a.id);
    assert.equal(rows[0].body, task.mine.title);
    assert.equal(rows[0].status, 'UNREAD');
    assert.ok(!JSON.stringify(rows[0]).includes('colours'), 'the comment text is not in the notice');
    const bell = await as(t.assignee, request(server).get('/api/notifications'));
    assert.ok(bell.body.some((n) => n.id === rows[0].id), 'and it is in their bell');
    assert.equal((await notices(p.owner.id, task.mine.id)).length, 0, 'the author is not told');
  });

  it('once per comment and person: saving again does not notify again, a person added later is told then', async () => {
    const same = await edit(t.owner, first.id, `Please check the colours and the titles, ${at(p.assignee)}.`);
    assert.equal(same.status, 200, JSON.stringify(same.body));
    assert.equal((await notices(p.assignee.id, task.mine.id)).length, 1);

    const added = await edit(t.owner, first.id, `Please check the colours, ${at(p.assignee)} and ${at(p.manager)}.`);
    assert.equal(added.status, 200, JSON.stringify(added.body));
    assert.deepEqual(added.body.mentions.map((m) => m.id), [p.assignee.id, p.manager.id]);
    assert.equal((await notices(p.assignee.id, task.mine.id)).length, 1);
    assert.equal((await notices(p.manager.id, task.mine.id)).length, 1);
  });

  it('a mention of oneself notifies nobody', async () => {
    const before = await allNotices();
    const res = await comment(t.manager, task.mine.id, `Note to self ${at(p.manager)}.`);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(await allNotices(), before);
  });

  it('the name inside a mention is the member\'s real name, whatever the request says', async () => {
    const res = await comment(t.owner, task.mine.id, `Ask ${at(p.assignee, 'The Owner')} about it.`);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.body, `Ask ${at(p.assignee)} about it.`);
  });

  it('who can be mentioned: the people who may read this thread, and nobody else', async () => {
    const mine = await mentionable(t.owner, task.mine.id);
    assert.equal(mine.status, 200, JSON.stringify(mine.body));
    assert.deepEqual(mine.body.map((m) => m.id).sort(), [p.owner.id, p.manager.id, p.assignee.id].sort(),
      'OWNER, MANAGER and the employee who sees the task; not the other employee, the contractor or the client');
    assert.deepEqual(Object.keys(mine.body[0]).sort(), ['displayName', 'id'], 'a name and an id, no e-mail address and no role');
    const unassigned = await mentionable(t.owner, task.unassigned.id);
    assert.deepEqual(unassigned.body.map((m) => m.id).sort(), [p.owner.id, p.manager.id].sort());
    assert.equal((await mentionable(t.owner, task.foreign.id)).status, 404);
    assert.equal((await as(t.owner, request(server).get(`${notes}/mentionable`))).status, 400);
  });
});

describe('G07 - only people who may read the thread can be mentioned', { skip }, () => {
  for (const [label, target] of [
    ['a CLIENT of the same company', () => p.client.id],
    ['a CONTRACTOR, even on a task assigned to them', () => p.contractor.id],
    ['an employee who may not see the task', () => p.other.id],
    ['a member of another company', () => p.ownerB.id],
    ['an id that does not exist', () => 'nobody0000000000000000000'],
  ]) {
    it(`${label} is refused; nothing is stored and nobody is notified`, async () => {
      const taskId = label.startsWith('a CONTRACTOR') ? task.contracted.id : task.mine.id;
      const [notesBefore, noticesBefore] = [await stored(taskId), await allNotices()];
      const res = await comment(t.owner, taskId, `Hello @[Someone](user:${target()}) and ${at(p.manager)}.`);
      assert.equal(res.status, 400, JSON.stringify(res.body));
      assert.equal(res.body.code ?? res.body.error?.code ?? res.body.message?.code, 'MENTION_NOT_ALLOWED', JSON.stringify(res.body));
      assert.equal(await stored(taskId), notesBefore);
      assert.equal(await allNotices(), noticesBefore, 'the allowed person in the same comment is not told either');
    });
  }

  it('the same refusal when a comment is changed', async () => {
    const mineNote = await comment(t.owner, task.mine.id, 'A plain comment.');
    const res = await edit(t.owner, mineNote.body.id, `Now with @[Client](user:${p.client.id}).`);
    assert.equal(res.status, 400, JSON.stringify(res.body));
    const row = await prisma.internalNote.findUnique({ where: { id: mineNote.body.id } });
    assert.equal(row.body, 'A plain comment.');
    assert.equal((await prisma.notification.count({ where: { recipientUserId: p.client.id, title: MENTION_TITLE } })), 0);
  });

  it('more than twenty mentions in one comment are refused', async () => {
    const many = Array.from({ length: 21 }, (_, i) => `@[x](user:u${i})`).join(' ');
    assert.equal((await comment(t.owner, task.mine.id, many)).status, 400);
  });
});

describe('G07 - a CLIENT and a CONTRACTOR never reach internal comments', { skip }, () => {
  for (const who of ['client', 'contractor']) {
    it(`${who}: every notes route is refused`, async () => {
      const taskId = who === 'contractor' ? task.contracted.id : task.mine.id;
      const existing = (await list(t.owner, task.mine.id)).body[0].id;
      const before = await stored(taskId);
      assert.equal((await list(t[who], taskId)).status, 403);
      assert.equal((await as(t[who], request(server).get(notes))).status, 403);
      assert.equal((await as(t[who], request(server).get(`${notes}/${existing}`))).status, 403);
      assert.equal((await mentionable(t[who], taskId)).status, 403);
      assert.equal((await comment(t[who], taskId, 'May I?')).status, 403);
      assert.equal((await edit(t[who], existing, 'Changed')).status, 403);
      assert.equal((await remove(t[who], existing)).status, 403);
      assert.equal(await stored(taskId), before);
    });
  }

  it('nothing the client portal answers for this work contains a comment', async () => {
    const marker = `only-internal-${RUN}`;
    assert.equal((await comment(t.owner, task.mine.id, `Margin is thin here, ${marker}.`)).status, 201);
    for (const path of ['/api/client/projects', '/api/client/progress', '/api/client/tasks', '/api/client/summary', '/api/client/deliveries', '/api/notifications']) {
      const res = await as(t.client, request(server).get(path));
      assert.ok(!JSON.stringify(res.body).includes(marker), `${path} (${res.status}) does not carry the comment`);
    }
  });
});

describe('G07 - an employee reaches only the comments of tasks they may see', { skip }, () => {
  let hidden;

  it('comments of a task they may not see are out of reach on every route, and answer like a task that is not there', async () => {
    const res = await comment(t.owner, task.unassigned.id, `Internal budget ${RUN}.`);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    hidden = res.body.id;

    assert.equal((await list(t.other, task.unassigned.id)).status, 404);
    assert.equal((await mentionable(t.other, task.unassigned.id)).status, 404);
    assert.equal((await as(t.other, request(server).get(`${notes}/${hidden}`))).status, 404);
    assert.equal((await comment(t.other, task.unassigned.id, 'Let me in')).status, 404);
    assert.equal((await edit(t.other, hidden, 'Changed')).status, 404);
    assert.equal((await remove(t.other, hidden)).status, 404);
    const row = await prisma.internalNote.findUnique({ where: { id: hidden } });
    assert.equal(row.body, `Internal budget ${RUN}.`);
    assert.equal(await stored(task.unassigned.id), 1);

    // The same employee is refused the same way on the task they do not see at all.
    assert.equal((await list(t.other, task.mine.id)).status, 404);
  });

  it('the general list leaves those comments out and keeps everything else', async () => {
    const general = await as(t.owner, request(server).post(notes)).send({ body: `General note ${RUN}` });
    assert.equal(general.status, 201, JSON.stringify(general.body));

    const forOther = await as(t.other, request(server).get(notes));
    assert.equal(forOther.status, 200);
    assert.ok(forOther.body.some((n) => n.id === general.body.id), 'a note that is on no task is still listed');
    assert.ok(!forOther.body.some((n) => n.resourceType === 'task'), 'no comment of a task this employee does not see');
    assert.equal((await as(t.other, request(server).get(`${notes}?resourceType=task`))).body.length, 0);

    const forAssignee = await as(t.assignee, request(server).get(notes));
    const taskIds = new Set(forAssignee.body.filter((n) => n.resourceType === 'task').map((n) => n.resourceId));
    assert.deepEqual([...taskIds], [task.mine.id], 'the assignee sees the comments of their own task only');

    const forOwner = await as(t.owner, request(server).get(notes));
    assert.ok(forOwner.body.some((n) => n.id === hidden), 'the OWNER still sees every comment');
  });

  it('the employee who sees the task reads and writes its thread', async () => {
    assert.equal((await list(t.assignee, task.mine.id)).status, 200);
    assert.equal((await comment(t.assignee, task.mine.id, 'Uploaded the next cut.')).status, 201);
  });
});

describe('G07 - another company stays out of reach', { skip }, () => {
  it('its task cannot be commented or read, its comments cannot be read, changed or removed', async () => {
    const theirs = await comment(t.ownerB, task.foreign.id, `Company B only ${RUN}.`);
    assert.equal(theirs.status, 201, JSON.stringify(theirs.body));
    const before = await stored(task.foreign.id);

    assert.equal((await comment(t.owner, task.foreign.id, 'Hello')).status, 400, 'a foreign reference, as before');
    assert.equal((await list(t.owner, task.foreign.id)).status, 404);
    assert.equal((await as(t.owner, request(server).get(`${notes}/${theirs.body.id}`))).status, 404);
    assert.equal((await edit(t.owner, theirs.body.id, 'Changed')).status, 404);
    assert.equal((await remove(t.owner, theirs.body.id)).status, 404);
    assert.equal(await stored(task.foreign.id), before);
    const ours = await as(t.owner, request(server).get(notes));
    assert.ok(!ours.body.some((n) => n.id === theirs.body.id));

    // Mentioning across the border from the other side is refused as well.
    assert.equal((await comment(t.ownerB, task.foreign.id, `Hi ${at(p.owner)}`)).status, 400);
    assert.equal((await prisma.notification.count({ where: { recipientUserId: p.owner.id, tenantId: co.b.id } })), 0);
  });
});

describe('G07 - a thread is not rewritten by others', { skip }, () => {
  it('only the author changes a comment; the author, an OWNER or a MANAGER removes it', async () => {
    const byAssignee = await comment(t.assignee, task.mine.id, 'First version of my comment.');
    assert.equal(byAssignee.status, 201);
    const id = byAssignee.body.id;

    assert.equal((await edit(t.owner, id, 'Owner rewrites it')).status, 403, 'not even the OWNER rewrites someone else\'s words');
    assert.equal((await edit(t.manager, id, 'Manager rewrites it')).status, 403);
    assert.equal((await prisma.internalNote.findUnique({ where: { id } })).body, 'First version of my comment.');
    const own = await edit(t.assignee, id, 'Second version of my comment.');
    assert.equal(own.status, 200, JSON.stringify(own.body));
    assert.equal(own.body.body, 'Second version of my comment.');

    const byOwner = await comment(t.owner, task.mine.id, 'An owner comment.');
    assert.equal((await remove(t.assignee, byOwner.body.id)).status, 403, 'an employee does not remove someone else\'s comment');
    assert.equal((await remove(t.manager, byOwner.body.id)).status, 204, 'a MANAGER does');
    assert.equal((await remove(t.assignee, id)).status, 204, 'the author removes their own');
    assert.equal(await prisma.internalNote.count({ where: { id: { in: [id, byOwner.body.id] } } }), 0);
  });

  it('a deleted task takes its comments with it, and nothing else', async () => {
    const gone = await prisma.task.create({ data: { tenantId: co.a.id, title: `Short lived ${RUN}` } });
    assert.equal((await comment(t.owner, gone.id, 'First.')).status, 201);
    assert.equal((await comment(t.manager, gone.id, 'Second.')).status, 201);
    const [others, general] = [await stored(task.mine.id), await prisma.internalNote.count({ where: { tenantId: co.a.id, resourceType: null } })];
    assert.ok(others > 0);

    const res = await remove2(t.owner, gone.id);
    assert.ok([200, 204].includes(res.status), JSON.stringify(res.body));
    assert.equal(await stored(gone.id), 0, 'no comment is left behind without its task');
    assert.equal(await stored(task.mine.id), others, 'other threads are untouched');
    assert.equal(await prisma.internalNote.count({ where: { tenantId: co.a.id, resourceType: null } }), general, 'general notes are untouched');
    const ownerList = await as(t.owner, request(server).get(notes));
    assert.ok(!ownerList.body.some((n) => n.resourceId === gone.id));
  });

  it('notes that are not on a task keep their rules', async () => {
    const general = await as(t.owner, request(server).post(notes)).send({ body: `Shared note ${RUN}` });
    const changed = await edit(t.assignee, general.body.id, `Shared note ${RUN}, extended`);
    assert.equal(changed.status, 200, JSON.stringify(changed.body));
    assert.equal((await remove(t.assignee, general.body.id)).status, 204);
  });
});
