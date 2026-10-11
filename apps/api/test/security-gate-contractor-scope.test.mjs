/**
 * Security gate - contractors see only their assigned work (MAOS-T35).
 *
 * Owner decision 2026-10-10: a CONTRACTOR sees only the projects, tasks and
 * files they are assigned to. Before this gate a contractor was limited by
 * resource type only, so they could list every project, task and file of the
 * tenant. Assignment means:
 *   - ProjectMember of a project: the project, all its tasks and files;
 *   - assignee of a task: that task, its subtasks and files, and its
 *     project's own record (not the project's other tasks or files).
 * These tests drive the real app over HTTP: lists, detail, update, delete,
 * reorder, subtasks, files, file versions and the dashboard summary, for the
 * contractor and - as a control - for an employee who keeps tenant-wide
 * access. The scope comes from the database membership, so a role change
 * applies on the next request.
 *
 * Prerequisites (otherwise the whole suite skips rather than failing):
 *   npm run build; migrated PostgreSQL; DATABASE_URL + JWT_SECRET; MAOS_INTEGRATION=1.
 * Seeds its own tenant directly, so it shares a database with the other suites.
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

const RUN = `cs${Date.now().toString(36)}`;
const PASSWORD = 'ContractorPass123!';

let app;
let server;
let request;
let prisma;
const tokens = {};
const ids = {};
let tenant;
const users = {};

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

const as = (who, req) => req.set('Authorization', `Bearer ${tokens[who]}`);
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

  tenant = await seedTenant('acme');
  const t = tenant.id;
  users.owner = await seedUser(t, 'owner', 'OWNER');
  users.contractor = await seedUser(t, 'contractor', 'CONTRACTOR');
  users.employee = await seedUser(t, 'employee', 'EMPLOYEE');
  const C = users.contractor.id;
  const E = users.employee.id;

  const project = (name) => prisma.project.create({ data: { tenantId: t, name: `${name} ${RUN}` }, select: { id: true } });
  const task = (title, projectId, assignedToUserId) =>
    prisma.task.create({ data: { tenantId: t, title: `${title} ${RUN}`, projectId, assignedToUserId }, select: { id: true } });
  const file = (name, data) => prisma.fileAsset.create({ data: { tenantId: t, name: `${name}-${RUN}.pdf`, ...data }, select: { id: true } });

  ids.P1 = (await project('Member project')).id; // contractor is a ProjectMember
  ids.P2 = (await project('Assigned-task project')).id; // contractor only has one task here
  ids.P3 = (await project('Unrelated project')).id;
  await prisma.projectMember.create({ data: { tenantId: t, projectId: ids.P1, userId: C, role: 'CONTRACTOR' } });

  ids.T1a = (await task('P1 open task', ids.P1, null)).id;
  ids.T2a = (await task('P2 contractor task', ids.P2, C)).id;
  ids.T2b = (await task('P2 employee task', ids.P2, E)).id;
  ids.T3 = (await task('P3 task', ids.P3, null)).id;
  ids.T0 = (await task('Loose contractor task', null, C)).id;
  ids.T0b = (await task('Loose other task', null, null)).id;
  ids.S2b = (await prisma.subtask.create({ data: { tenantId: t, taskId: ids.T2b, title: `Hidden subtask ${RUN}` }, select: { id: true } })).id;

  ids.F1 = (await file('p1', { projectId: ids.P1 })).id;
  ids.F2 = (await file('t2a', { taskId: ids.T2a })).id;
  ids.F2b = (await file('t2b', { taskId: ids.T2b })).id;
  ids.F3 = (await file('p3', { projectId: ids.P3 })).id;
  await prisma.fileVersion.create({ data: { tenantId: t, fileAssetId: ids.F1, versionNumber: 1 } });
  await prisma.fileVersion.create({ data: { tenantId: t, fileAssetId: ids.F3, versionNumber: 1 } });

  for (const who of ['owner', 'contractor', 'employee']) {
    const res = await request(server)
      .post('/api/auth/login')
      .send({ email: users[who].email, passwordOrMagicCode: PASSWORD, tenantSlug: tenant.slug });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    tokens[who] = res.body.tokens.accessToken;
  }
});

after(async () => {
  if (app) await app.close();
});

const get = (who, path) => as(who, request(server).get(path));
const listIds = async (who, path) => {
  const res = await get(who, path);
  assert.equal(res.status, 200, `${who} ${path}: ${JSON.stringify(res.body)}`);
  const items = Array.isArray(res.body) ? res.body : res.body.items;
  return new Set(items.map((x) => x.id));
};
const assertSet = (actual, included, excluded, label) => {
  for (const k of included) assert.ok(actual.has(ids[k]), `${label}: ${k} missing`);
  for (const k of excluded) assert.ok(!actual.has(ids[k]), `${label}: ${k} must not be visible`);
};

describe('Contractor scope - projects', { skip }, () => {
  it('lists only member projects and projects of assigned tasks', async () => {
    assertSet(await listIds('contractor', '/api/projects'), ['P1', 'P2'], ['P3'], 'contractor projects');
  });

  it("shows only the contractor's own task inside a project reached through one assignment", async () => {
    const res = await get('contractor', `/api/projects/${ids.P2}`);
    assert.equal(res.status, 200);
    const taskIds = res.body.tasks.map((x) => x.id);
    assert.deepEqual(taskIds, [ids.T2a]);
    assert.equal(res.body._count.tasks, 1);
  });

  it('answers 404 for an unrelated project', async () => {
    assert.equal((await get('contractor', `/api/projects/${ids.P3}`)).status, 404);
  });

  it('employee keeps tenant-wide projects (control)', async () => {
    assertSet(await listIds('employee', '/api/projects'), ['P1', 'P2', 'P3'], [], 'employee projects');
    assert.equal((await get('employee', `/api/projects/${ids.P2}`)).body._count.tasks, 2);
  });
});

describe('Contractor scope - tasks', { skip }, () => {
  it('lists assigned tasks and tasks of member projects only', async () => {
    assertSet(await listIds('contractor', '/api/tasks'), ['T1a', 'T2a', 'T0'], ['T2b', 'T3', 'T0b'], 'contractor tasks');
  });

  it('still applies list filters inside the scope', async () => {
    assertSet(await listIds('contractor', `/api/tasks?projectId=${ids.P2}`), ['T2a'], ['T2b'], 'filtered');
  });

  it('answers 404 for detail, update and delete of a task outside the scope, changing nothing', async () => {
    assert.equal((await get('contractor', `/api/tasks/${ids.T2b}`)).status, 404);
    const patch = await as('contractor', request(server).patch(`/api/tasks/${ids.T2b}`)).send({ title: 'hijacked' });
    assert.equal(patch.status, 404);
    const del = await as('contractor', request(server).delete(`/api/tasks/${ids.T3}`));
    assert.equal(del.status, 404);
    const t2b = await prisma.task.findUnique({ where: { id: ids.T2b }, select: { title: true } });
    assert.notEqual(t2b.title, 'hijacked');
    assert.ok(await prisma.task.findUnique({ where: { id: ids.T3 } }));
  });

  it('can read and update its own tasks (control)', async () => {
    assert.equal((await get('contractor', `/api/tasks/${ids.T1a}`)).status, 200);
    const patch = await as('contractor', request(server).patch(`/api/tasks/${ids.T2a}`)).send({ title: `Done ${RUN}` });
    assert.equal(patch.status, 200, JSON.stringify(patch.body));
  });

  it('cannot reorder a task outside the scope', async () => {
    const res = await as('contractor', request(server).patch('/api/tasks/reorder')).send({
      items: [{ id: ids.T1a, sortOrder: 1 }, { id: ids.T2b, sortOrder: 2 }],
    });
    assert.equal(res.status, 404, JSON.stringify(res.body));
  });

  it('may create tasks only in a member project', async () => {
    const create = (projectId) =>
      as('contractor', request(server).post('/api/tasks')).send({ title: `New ${RUN}`, projectId });
    assert.equal((await create(ids.P3)).status, 403);
    assert.equal((await create(ids.P2)).status, 403, 'an assigned task does not open the whole project');
    assert.equal((await create(ids.P1)).status, 201);
  });

  it('cannot move its task into a project outside its membership', async () => {
    const res = await as('contractor', request(server).patch(`/api/tasks/${ids.T0}`)).send({ projectId: ids.P3 });
    assert.equal(res.status, 403);
    const t0 = await prisma.task.findUnique({ where: { id: ids.T0 }, select: { projectId: true } });
    assert.equal(t0.projectId, null);
  });

  it('employee keeps tenant-wide tasks (control)', async () => {
    assertSet(await listIds('employee', '/api/tasks'), ['T1a', 'T2a', 'T2b', 'T3', 'T0', 'T0b'], [], 'employee tasks');
  });
});

describe('Contractor scope - subtasks', { skip }, () => {
  it('answers 404 for subtasks of a task outside the scope', async () => {
    assert.equal((await get('contractor', `/api/tasks/${ids.T2b}/subtasks`)).status, 404);
    const create = await as('contractor', request(server).post(`/api/tasks/${ids.T2b}/subtasks`)).send({ title: `Sneak ${RUN}` });
    assert.equal(create.status, 404);
    const patch = await as('contractor', request(server).patch(`/api/subtasks/${ids.S2b}`)).send({ title: 'hijacked' });
    assert.equal(patch.status, 404);
    const del = await as('contractor', request(server).delete(`/api/subtasks/${ids.S2b}`));
    assert.equal(del.status, 404);
    const s = await prisma.subtask.findUnique({ where: { id: ids.S2b }, select: { title: true } });
    assert.ok(s && s.title !== 'hijacked');
  });

  it('works on subtasks of its own task (control)', async () => {
    const create = await as('contractor', request(server).post(`/api/tasks/${ids.T2a}/subtasks`)).send({ title: `Step ${RUN}` });
    assert.equal(create.status, 201, JSON.stringify(create.body));
    assert.equal((await get('contractor', `/api/tasks/${ids.T2a}/subtasks`)).status, 200);
  });
});

describe('Contractor scope - files', { skip }, () => {
  it('lists files of member projects and of visible tasks only', async () => {
    assertSet(await listIds('contractor', '/api/files'), ['F1', 'F2'], ['F2b', 'F3'], 'contractor files');
  });

  it('answers 404 for a file outside the scope', async () => {
    assert.equal((await get('contractor', `/api/files/${ids.F3}`)).status, 404);
    assert.equal((await get('contractor', `/api/files/${ids.F1}`)).status, 200);
  });

  it('keeps file versions scoped even when FILE_VERSION read is granted by override', async () => {
    const membership = await prisma.tenantMembership.findFirst({
      where: { tenantId: tenant.id, userId: users.contractor.id },
      select: { id: true },
    });
    await prisma.membershipPermission.create({
      data: { membershipId: membership.id, action: 'read', resource: 'file-version', granted: true },
    });
    assert.equal((await get('contractor', `/api/files/${ids.F1}/versions`)).status, 200);
    assert.equal((await get('contractor', `/api/files/${ids.F3}/versions`)).status, 404);
  });

  it('employee keeps tenant-wide files (control)', async () => {
    assertSet(await listIds('employee', '/api/files'), ['F1', 'F2', 'F2b', 'F3'], [], 'employee files');
  });
});

describe('Contractor scope - dashboard and role changes', { skip }, () => {
  it('workspace summary counts only assigned work and zeroes other areas', async () => {
    const res = await get('contractor', '/api/dashboards/workspace-summary');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.projectTasks, { projects: 2, tasks: 4 });
    assert.equal(res.body.collaboration.files, 2);
    assert.deepEqual(res.body.crm, { leads: 0, opportunities: 0, meetings: 0, pendingFollowUps: 0 });
    assert.equal(res.body.invoices, 0);
  });

  it('applies a role change on the next request (scope comes from the database)', async () => {
    await prisma.tenantMembership.updateMany({
      where: { tenantId: tenant.id, userId: users.contractor.id },
      data: { role: 'EMPLOYEE' },
    });
    try {
      assertSet(await listIds('contractor', '/api/projects'), ['P1', 'P2', 'P3'], [], 'promoted');
    } finally {
      await prisma.tenantMembership.updateMany({
        where: { tenantId: tenant.id, userId: users.contractor.id },
        data: { role: 'CONTRACTOR' },
      });
    }
    assertSet(await listIds('contractor', '/api/projects'), ['P1', 'P2'], ['P3'], 'demoted again');
  });
});
