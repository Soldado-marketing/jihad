/**
 * Security gate - foreign IDs in the work domain are tenant-validated (MAOS-T27).
 *
 * Request bodies and paths carry IDs of other records: a task's projectId and
 * assignee, a subtask's parent task and assignee. Before this gate those IDs
 * were written as given, so a member of tenant A could link a task to tenant
 * B's project, assign it to a tenant B user, or create a subtask inside tenant
 * B's task. These tests drive the real app over HTTP and prove that every such
 * reference must belong to the caller's tenant, that nothing is written when it
 * does not, and that the refusal does not reveal whether the ID exists
 * elsewhere.
 *
 * Prerequisites (otherwise the whole suite skips rather than failing):
 *   npm run build; migrated PostgreSQL; DATABASE_URL + JWT_SECRET; MAOS_INTEGRATION=1.
 * Seeds its own two tenants directly, so it shares a database with the other suites.
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

const RUN = `fi${Date.now().toString(36)}`;
const PASSWORD = 'ForeignIdPass123!';

let app;
let server;
let request;
let prisma;
let token = '';
const home = {};
const foreign = {};

async function seedTenant(label) {
  return prisma.tenant.create({ data: { name: `${label} ${RUN}`, slug: `${label}-${RUN}`, status: 'ACTIVE' }, select: { id: true, slug: true } });
}

async function seedUser(tenantId, label, role, membershipStatus = 'ACTIVE') {
  const bcrypt = require('bcrypt');
  const user = await prisma.user.create({
    data: { email: `${label}-${RUN}@example.test`, displayName: label, passwordHash: await bcrypt.hash(PASSWORD, 10), status: 'APPROVED' },
    select: { id: true, email: true },
  });
  await prisma.tenantMembership.create({
    data: { tenantId, userId: user.id, role, status: membershipStatus, visibilityScope: 'TENANT_WIDE' },
  });
  return user;
}

const as = (req) => req.set('Authorization', `Bearer ${token}`);
const NON_EXISTENT = 'cxxxxxxxxxxxxxxxxxxxxxxxx';

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
  server = app.getHttpServer();
  request = require('supertest');
  const { PrismaService } = require(join(apiRoot, 'dist/modules/prisma/prisma.service.js'));
  prisma = app.get(PrismaService);

  const t1 = await seedTenant('home');
  home.tenantId = t1.id;
  const owner = await seedUser(t1.id, 'owner', 'OWNER');
  home.member = await seedUser(t1.id, 'member', 'EMPLOYEE');
  home.removed = await seedUser(t1.id, 'removed', 'EMPLOYEE', 'REMOVED');
  home.project = await prisma.project.create({ data: { tenantId: t1.id, name: `Home project ${RUN}` }, select: { id: true } });
  home.task = await prisma.task.create({ data: { tenantId: t1.id, title: `Home task ${RUN}` }, select: { id: true } });
  home.subtask = await prisma.subtask.create({ data: { tenantId: t1.id, taskId: home.task.id, title: `Home subtask ${RUN}` }, select: { id: true } });

  const t2 = await seedTenant('foreign');
  foreign.tenantId = t2.id;
  foreign.user = await seedUser(t2.id, 'stranger', 'EMPLOYEE');
  foreign.project = await prisma.project.create({ data: { tenantId: t2.id, name: `Foreign project ${RUN}` }, select: { id: true } });
  foreign.task = await prisma.task.create({ data: { tenantId: t2.id, title: `Foreign task ${RUN}` }, select: { id: true } });

  const res = await request(server).post('/api/auth/login').send({ email: owner.email, passwordOrMagicCode: PASSWORD, tenantSlug: t1.slug });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  token = res.body.tokens.accessToken;
});

after(async () => {
  if (app) await app.close();
});

/** A refusal must not reveal whether the ID exists in another tenant. */
function assertNonLeaking(res, ...values) {
  const body = JSON.stringify(res.body);
  for (const v of values) assert.ok(!body.includes(v), `refusal leaked ${v}`);
  assert.ok(!/Foreign|stranger/i.test(body), 'refusal leaked foreign data');
}

describe('Gate - task create', { skip }, () => {
  const countTasks = (title) => prisma.task.count({ where: { title } });

  it('accepts a project and an assignee from the same tenant (control)', async () => {
    const res = await as(request(server).post('/api/tasks')).send({ title: `ok-${RUN}`, projectId: home.project.id, assignedToUserId: home.member.id });
    assert.equal(res.status, 201, JSON.stringify(res.body));
  });

  for (const [label, body, value] of [
    ['a foreign project', () => ({ projectId: foreign.project.id }), () => foreign.project.id],
    ['a non-existent project', () => ({ projectId: NON_EXISTENT }), () => NON_EXISTENT],
    ['a foreign assignee', () => ({ assignedToUserId: foreign.user.id }), () => foreign.user.id],
    ['an assignee whose membership was removed', () => ({ assignedToUserId: home.removed.id }), () => home.removed.id],
  ]) {
    it(`refuses ${label} with 400 and writes nothing`, async () => {
      const title = `bad-${label.replace(/\W+/g, '-')}-${RUN}`;
      const res = await as(request(server).post('/api/tasks')).send({ title, ...body() });
      assert.equal(res.status, 400, JSON.stringify(res.body));
      assert.equal(await countTasks(title), 0);
      assertNonLeaking(res, value());
    });
  }
});

describe('Gate - task update', { skip }, () => {
  const read = () => prisma.task.findUnique({ where: { id: home.task.id }, select: { projectId: true, assignedToUserId: true } });

  it('refuses a foreign project and leaves the task unchanged', async () => {
    const before = await read();
    const res = await as(request(server).patch(`/api/tasks/${home.task.id}`)).send({ projectId: foreign.project.id });
    assert.equal(res.status, 400, JSON.stringify(res.body));
    assert.deepEqual(await read(), before);
  });

  it('refuses a foreign assignee and leaves the task unchanged', async () => {
    const before = await read();
    const res = await as(request(server).patch(`/api/tasks/${home.task.id}`)).send({ assignedToUserId: foreign.user.id });
    assert.equal(res.status, 400, JSON.stringify(res.body));
    assert.deepEqual(await read(), before);
  });

  it('allows a same-tenant assignee and unassigning with null (control)', async () => {
    let res = await as(request(server).patch(`/api/tasks/${home.task.id}`)).send({ assignedToUserId: home.member.id, projectId: home.project.id });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    res = await as(request(server).patch(`/api/tasks/${home.task.id}`)).send({ assignedToUserId: null });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal((await read()).assignedToUserId, null);
  });
});

describe('Gate - subtasks', { skip }, () => {
  it("refuses to create a subtask inside another tenant's task (404) and writes nothing", async () => {
    const res = await as(request(server).post(`/api/tasks/${foreign.task.id}/subtasks`)).send({ title: `intrusion-${RUN}` });
    assert.equal(res.status, 404, JSON.stringify(res.body));
    assert.equal(await prisma.subtask.count({ where: { taskId: foreign.task.id } }), 0);
    assertNonLeaking(res, foreign.task.id);
  });

  it('refuses a foreign assignee on create (400)', async () => {
    const res = await as(request(server).post(`/api/tasks/${home.task.id}/subtasks`)).send({ title: `sub-bad-${RUN}`, assignedToUserId: foreign.user.id });
    assert.equal(res.status, 400, JSON.stringify(res.body));
    assert.equal(await prisma.subtask.count({ where: { title: `sub-bad-${RUN}` } }), 0);
  });

  it('refuses a foreign assignee on update (400) and leaves the subtask unchanged', async () => {
    const res = await as(request(server).patch(`/api/subtasks/${home.subtask.id}`)).send({ assignedToUserId: foreign.user.id });
    assert.equal(res.status, 400, JSON.stringify(res.body));
    const s = await prisma.subtask.findUnique({ where: { id: home.subtask.id }, select: { assignedToUserId: true } });
    assert.equal(s.assignedToUserId, null);
  });

  it('accepts a same-tenant assignee (control)', async () => {
    const res = await as(request(server).post(`/api/tasks/${home.task.id}/subtasks`)).send({ title: `sub-ok-${RUN}`, assignedToUserId: home.member.id });
    assert.equal(res.status, 201, JSON.stringify(res.body));
  });
});
