/**
 * Custom project board lists (owner approval 2026-10-29).
 *
 * Proves: every project has its own lists (create, rename, reorder, archive,
 * restore) that persist; initialisation is explicit and idempotent and reading
 * a board writes nothing; cards move between lists of their own project only,
 * keep their order, take a mapped status and keep an unmapped one; changing
 * the structure needs project UPDATE (OWNER, MANAGER) while moving cards stays
 * task UPDATE; a contractor sees only their projects; a CLIENT and another
 * tenant get nothing; tasks without a list keep working; the database refuses
 * a list of another project or tenant even if the API were bypassed.
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
const built = existsSync(join(apiRoot, 'dist/app.module.js'));
const configured = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET);
const skip = !enabled
  ? 'set MAOS_INTEGRATION=1 to run'
  : !built
    ? 'run `npm run build` first'
    : !configured
      ? 'DATABASE_URL and JWT_SECRET must be set'
      : false;

const RUN = `tl${Date.now().toString(36)}`;
const PASSWORD = 'BoardListsPass123!';

let app;
let server;
let request;
let prisma;
const tokens = {};
const ids = {};
const users = {};
let tenant;

async function seedTenant(label) {
  return prisma.tenant.create({ data: { name: `${label} ${RUN}`, slug: `${label}-${RUN}`, status: 'ACTIVE' }, select: { id: true, slug: true } });
}

async function seedUser(tenantId, label, role) {
  const bcrypt = require('bcrypt');
  const user = await prisma.user.create({
    data: { email: `${label}-${RUN}@example.test`, displayName: label, passwordHash: await bcrypt.hash(PASSWORD, 10), status: 'APPROVED' },
    select: { id: true, email: true },
  });
  await prisma.tenantMembership.create({ data: { tenantId, userId: user.id, role, status: 'ACTIVE', visibilityScope: 'TENANT_WIDE' } });
  return user;
}

const as = (who, req) => req.set('Authorization', `Bearer ${tokens[who]}`);
const get = (who, path) => as(who, request(server).get(path));
const post = (who, path, body = {}) => as(who, request(server).post(path)).send(body);
const patch = (who, path, body) => as(who, request(server).patch(path)).send(body);
const names = (res) => res.body.map((l) => l.name);
const listCount = (projectId) => prisma.taskList.count({ where: { projectId } });

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

  tenant = await seedTenant('board');
  const t = tenant.id;
  for (const [who, role] of [['owner', 'OWNER'], ['manager', 'MANAGER'], ['employee', 'EMPLOYEE'], ['contractor', 'CONTRACTOR'], ['client', 'CLIENT']]) {
    users[who] = await seedUser(t, who, role);
  }
  await prisma.tenantMembership.updateMany({ where: { tenantId: t, userId: users.client.id }, data: { clientScopeKey: `board-${RUN}` } });

  const project = async (name) => (await prisma.project.create({ data: { tenantId: t, name: `${name} ${RUN}` }, select: { id: true } })).id;
  ids.VIDEO = await project('Video production');
  ids.WEB = await project('Website');
  ids.HIDDEN = await project('Not the contractor\'s');
  await prisma.projectMember.create({ data: { tenantId: t, projectId: ids.VIDEO, userId: users.contractor.id } });

  const task = async (title, projectId, status = 'TODO') =>
    (await prisma.task.create({ data: { tenantId: t, title: `${title} ${RUN}`, projectId, status }, select: { id: true } })).id;
  ids.CUT = await task('Rough cut', ids.VIDEO);
  ids.SOUND = await task('Sound mix', ids.VIDEO, 'IN_PROGRESS');
  ids.THUMB = await task('Thumbnail', ids.VIDEO);
  ids.HOME = await task('Homepage', ids.WEB);
  ids.LOOSE = await task('No project', null);

  const other = await seedTenant('other');
  ids.FP = (await prisma.project.create({ data: { tenantId: other.id, name: `Foreign ${RUN}` }, select: { id: true } })).id;
  ids.FL = (await prisma.taskList.create({ data: { tenantId: other.id, projectId: ids.FP, name: 'Foreign list', sortOrder: 1000 }, select: { id: true } })).id;

  for (const who of Object.keys(users)) {
    const res = await request(server).post('/api/auth/login').send({ email: users[who].email, passwordOrMagicCode: PASSWORD, tenantSlug: tenant.slug });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    tokens[who] = res.body.tokens.accessToken;
  }
});

after(async () => {
  if (app) await app.close();
});

describe('custom board lists', { skip }, () => {
  it('reading a board writes nothing: no lists until initialised', async () => {
    const res = await get('owner', `/api/projects/${ids.VIDEO}/lists`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
    assert.equal(await listCount(ids.VIDEO), 0);
  });

  it('initialises explicitly and idempotently, even under concurrent calls', async () => {
    const [a, b] = await Promise.all([
      post('owner', `/api/projects/${ids.VIDEO}/lists/initialize`),
      post('manager', `/api/projects/${ids.VIDEO}/lists/initialize`),
    ]);
    assert.equal(a.status, 201);
    assert.equal(b.status, 201);
    assert.deepEqual([a.body.created, b.body.created].sort(), [false, true]);
    assert.deepEqual(a.body.lists.map((l) => l.name), ['To Do', 'In Progress', 'In Review', 'Blocked', 'Done']);
    assert.equal(await listCount(ids.VIDEO), 5);
    const again = await post('owner', `/api/projects/${ids.VIDEO}/lists/initialize`);
    assert.equal(again.body.created, false);
    assert.equal(await listCount(ids.VIDEO), 5);
    assert.equal(await prisma.task.count({ where: { projectId: ids.VIDEO, listId: { not: null } } }), 0, 'initialising moves no task');
  });

  it('builds a workflow of its own: many custom lists, renamed, reordered, persisted', async () => {
    const created = {};
    for (const name of ['To Edit', 'Editing', 'Review', 'Revisions', 'Approved', 'Published']) {
      const res = await post('owner', `/api/projects/${ids.WEB}/lists`, { name: `  ${name}  `, ...(name === 'Published' ? { status: 'DONE' } : {}) });
      assert.equal(res.status, 201, JSON.stringify(res.body));
      assert.equal(res.body.name, name, 'names are trimmed');
      created[name] = res.body.id;
    }
    assert.equal((await patch('manager', `/api/lists/${created.Review}`, { name: 'Client review' })).status, 200);
    const order = ['Editing', 'To Edit', 'Review', 'Revisions', 'Approved', 'Published'].map((n) => created[n]);
    assert.equal((await patch('owner', `/api/projects/${ids.WEB}/lists/reorder`, { ids: order })).status, 200);

    const res = await get('employee', `/api/projects/${ids.WEB}/lists`);
    assert.deepEqual(names(res), ['Editing', 'To Edit', 'Client review', 'Revisions', 'Approved', 'Published']);
    assert.equal(res.body.at(-1).status, 'DONE');
    ids.WEB_LISTS = created;
  });

  it('projects keep completely different workflows', async () => {
    const video = names(await get('owner', `/api/projects/${ids.VIDEO}/lists`));
    const web = names(await get('owner', `/api/projects/${ids.WEB}/lists`));
    assert.ok(!video.includes('Editing') && !web.includes('In Progress'));
  });

  it('archives and restores a list; its cards stay', async () => {
    const id = ids.WEB_LISTS.Revisions;
    await prisma.task.update({ where: { id: ids.HOME }, data: { listId: id } });
    assert.equal((await patch('owner', `/api/lists/${id}`, { archived: true })).status, 200);
    assert.ok(!names(await get('owner', `/api/projects/${ids.WEB}/lists`)).includes('Revisions'));
    const all = await get('owner', `/api/projects/${ids.WEB}/lists?includeArchived=true`);
    assert.ok(all.body.find((l) => l.id === id).archivedAt);
    assert.equal((await prisma.task.findUnique({ where: { id: ids.HOME } })).listId, id, 'card kept');
    assert.equal((await patch('owner', `/api/lists/${id}`, { archived: false })).status, 200);
    assert.equal(names(await get('owner', `/api/projects/${ids.WEB}/lists`)).at(-1), 'Revisions', 'restored at the end');
  });

  it('rejects bad input', async () => {
    assert.equal((await post('owner', `/api/projects/${ids.WEB}/lists`, { name: '   ' })).status, 400);
    assert.equal((await post('owner', `/api/projects/${ids.WEB}/lists`, { name: 'x'.repeat(61) })).status, 400);
    assert.equal((await post('owner', `/api/projects/${ids.WEB}/lists`, { name: 'Ok', status: 'NOPE' })).status, 400);
    const active = (await get('owner', `/api/projects/${ids.WEB}/lists`)).body.map((l) => l.id);
    assert.equal((await patch('owner', `/api/projects/${ids.WEB}/lists/reorder`, { ids: active.slice(1) })).status, 400, 'partial order');
    assert.equal((await patch('owner', `/api/projects/${ids.WEB}/lists/reorder`, { ids: [...active, active[0]] })).status, 400, 'duplicates');
  });
});

describe('moving cards between lists', { skip }, () => {
  let lists;
  before(async () => {
    if (skip) return;
    lists = Object.fromEntries((await get('owner', `/api/projects/${ids.VIDEO}/lists`)).body.map((l) => [l.name, l]));
    ids.CUSTOM = (await post('owner', `/api/projects/${ids.VIDEO}/lists`, { name: 'Waiting for footage' })).body.id;
  });

  it('moves cards with their positions; a mapped list sets the status, an unmapped one keeps it', async () => {
    const res = await patch('employee', '/api/tasks/reorder', {
      items: [
        { id: ids.THUMB, sortOrder: 1000, listId: lists['In Review'].id },
        { id: ids.CUT, sortOrder: 2000, listId: lists['In Review'].id },
        { id: ids.SOUND, sortOrder: 1000, listId: ids.CUSTOM },
      ],
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const rows = await prisma.task.findMany({ where: { id: { in: [ids.THUMB, ids.CUT, ids.SOUND] } }, orderBy: { sortOrder: 'asc' } });
    const by = Object.fromEntries(rows.map((r) => [r.id, r]));
    assert.equal(by[ids.THUMB].status, 'IN_REVIEW');
    assert.equal(by[ids.CUT].listId, lists['In Review'].id);
    assert.ok(by[ids.THUMB].sortOrder < by[ids.CUT].sortOrder, 'position kept');
    assert.equal(by[ids.SOUND].status, 'IN_PROGRESS', 'custom list keeps the internal status');
    assert.equal(by[ids.SOUND].listId, ids.CUSTOM);
  });

  it('records the move in the card history', async () => {
    const res = await get('owner', `/api/activity/task/${ids.THUMB}`);
    assert.deepEqual(res.body.items.map((e) => e.action).sort(), ['task.list.changed', 'task.status.changed']);
  });

  it('refuses a list of another project, an archived list, a foreign list and a card without a project', async () => {
    const move = (id, listId) => patch('owner', '/api/tasks/reorder', { items: [{ id, sortOrder: 1, listId }] });
    assert.equal((await move(ids.CUT, ids.WEB_LISTS.Editing)).status, 400, 'other project');
    assert.equal((await move(ids.CUT, ids.FL)).status, 404, 'other tenant');
    assert.equal((await move(ids.LOOSE, lists['To Do'].id)).status, 400, 'no project');
    await patch('owner', `/api/lists/${ids.CUSTOM}`, { archived: true });
    assert.equal((await move(ids.CUT, ids.CUSTOM)).status, 404, 'archived');
    await patch('owner', `/api/lists/${ids.CUSTOM}`, { archived: false });
    assert.equal((await prisma.task.findUnique({ where: { id: ids.CUT } })).listId, lists['In Review'].id, 'nothing changed');
  });

  it('a card moved to another project leaves its list', async () => {
    const res = await patch('owner', `/api/tasks/${ids.CUT}`, { projectId: ids.WEB });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const row = await prisma.task.findUnique({ where: { id: ids.CUT } });
    assert.equal(row.listId, null);
    assert.equal(row.status, 'IN_REVIEW', 'status unchanged');
  });

  it('the database refuses a list of another project or tenant even without the API', async () => {
    await assert.rejects(prisma.task.update({ where: { id: ids.HOME }, data: { listId: lists['To Do'].id } }));
    await assert.rejects(prisma.task.update({ where: { id: ids.HOME }, data: { listId: ids.FL } }));
  });

  it('tasks without a list still list, filter and update as before', async () => {
    const res = await get('owner', `/api/tasks?projectId=${ids.WEB}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.every((t) => 'listId' in t));
    assert.equal((await patch('owner', `/api/tasks/${ids.LOOSE}`, { status: 'DONE' })).status, 200);
  });
});

describe('who may do what', { skip }, () => {
  it('only OWNER and MANAGER change the list structure', async () => {
    for (const who of ['employee', 'contractor']) {
      assert.equal((await post(who, `/api/projects/${ids.VIDEO}/lists`, { name: 'Nope' })).status, 403, who);
      assert.equal((await post(who, `/api/projects/${ids.VIDEO}/lists/initialize`)).status, 403, who);
      assert.equal((await patch(who, `/api/lists/${ids.CUSTOM}`, { name: 'Nope' })).status, 403, who);
    }
  });

  it('a contractor reads and moves cards only in their own project', async () => {
    assert.equal((await get('contractor', `/api/projects/${ids.VIDEO}/lists`)).status, 200);
    assert.equal((await get('contractor', `/api/projects/${ids.WEB}/lists`)).status, 404);
    const todo = (await get('contractor', `/api/projects/${ids.VIDEO}/lists`)).body.find((l) => l.name === 'To Do');
    assert.equal((await patch('contractor', '/api/tasks/reorder', { items: [{ id: ids.SOUND, sortOrder: 500, listId: todo.id }] })).status, 200);
    assert.equal((await patch('contractor', '/api/tasks/reorder', { items: [{ id: ids.HOME, sortOrder: 1, listId: ids.WEB_LISTS.Editing }] })).status, 404);
  });

  it('a CLIENT gets no internal board', async () => {
    assert.equal((await get('client', `/api/projects/${ids.VIDEO}/lists`)).status, 403);
    assert.equal((await post('client', `/api/projects/${ids.VIDEO}/lists`, { name: 'x' })).status, 403);
  });

  it('another tenant\'s project and list answer 404 and leak nothing', async () => {
    const res = await get('owner', `/api/projects/${ids.FP}/lists`);
    assert.equal(res.status, 404);
    assert.ok(!JSON.stringify(res.body).includes('Foreign'));
    assert.equal((await patch('owner', `/api/lists/${ids.FL}`, { name: 'Taken' })).status, 404);
    assert.equal((await post('owner', `/api/projects/${ids.FP}/lists/initialize`)).status, 404);
    assert.equal((await prisma.taskList.findUnique({ where: { id: ids.FL } })).name, 'Foreign list');
  });

  it('needs a session', async () => {
    assert.equal((await request(server).get(`/api/projects/${ids.VIDEO}/lists`)).status, 401);
  });
});
