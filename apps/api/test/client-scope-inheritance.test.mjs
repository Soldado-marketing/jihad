/**
 * A client's project carries the client scope (ADR-017); the work inside it
 * must carry it too, or sharing it never reaches the client portal. Found by
 * the five-role acceptance run on 2026-11-02: a task created under a client
 * project and then marked "visible to client" stayed invisible to the client
 * (clientScopeKey null), so the portal always showed "Tasks 0".
 *
 * These tests drive the real endpoints: create a task in a client project,
 * share it, read it as the client; move it to an internal project and make
 * sure the client loses it; change the project's customer and see its tasks
 * follow. (Invoices get the same treatment in the client-portal follow-up.)
 *
 * Prerequisites (otherwise the whole suite skips rather than failing):
 *   npm run build; migrated PostgreSQL; DATABASE_URL + JWT_SECRET; MAOS_INTEGRATION=1.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

process.env.S3_BUCKET ||= 'scope-test-bucket';
process.env.S3_REGION ||= 'eu-central-1';
process.env.S3_ACCESS_KEY_ID ||= 'scope';
process.env.S3_SECRET_ACCESS_KEY ||= 'scope';
process.env.S3_ENDPOINT = 'http://127.0.0.1:9';
process.env.S3_KEY_PREFIX = '';
process.env.S3_FORCE_PATH_STYLE = 'true';

const require = createRequire(import.meta.url);
const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const src = (p) => readFileSync(join(apiRoot, 'src', p), 'utf8');

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
const PASSWORD = 'ScopeCheckPass123!';
const SCOPE = `scope-${RUN}`;

let app;
let server;
let request;
let prisma;
let tenantId;
let ownerToken = '';
let clientToken = '';
let clientProject = '';
let internalProject = '';

const auth = (token, req) => req.set('Authorization', `Bearer ${token}`);

async function seedMember(label, role, clientScopeKey) {
  const bcrypt = require('bcrypt');
  const email = `${label}-${RUN}@example.test`;
  const user = await prisma.user.create({
    data: { email, displayName: label, passwordHash: await bcrypt.hash(PASSWORD, 10), status: 'APPROVED' },
    select: { id: true },
  });
  await prisma.tenantMembership.create({
    data: { tenantId, userId: user.id, role, status: 'ACTIVE', visibilityScope: role === 'CLIENT' ? 'CLIENT_LEVEL' : 'TENANT_WIDE', clientScopeKey },
  });
  const res = await request(server).post('/api/auth/login').send({ email, passwordOrMagicCode: PASSWORD, tenantSlug: `tenant-${RUN}` });
  assert.equal(res.status, 200, `login failed for ${label}: ${JSON.stringify(res.body)}`);
  return { id: user.id, token: res.body.tokens.accessToken };
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
  await app.init();
  await app.listen(0, '127.0.0.1');
  server = app.getHttpServer();
  request = require('supertest');
  const { PrismaService } = require(join(apiRoot, 'dist/modules/prisma/prisma.service.js'));
  prisma = app.get(PrismaService);

  const tenant = await prisma.tenant.create({ data: { name: `Tenant ${RUN}`, slug: `tenant-${RUN}`, status: 'ACTIVE' }, select: { id: true } });
  tenantId = tenant.id;
  ownerToken = (await seedMember('owner', 'OWNER', null)).token;
  const client = await seedMember('client', 'CLIENT', SCOPE);
  clientToken = client.token;

  const customer = await prisma.customer.create({ data: { tenantId, name: `Customer ${RUN}`, clientScopeKey: SCOPE }, select: { id: true } });
  clientProject = (await prisma.project.create({
    data: { tenantId, name: `${RUN} client project`, clientVisible: true, clientScopeKey: SCOPE, customerId: customer.id },
    select: { id: true },
  })).id;
  await prisma.projectMember.create({ data: { tenantId, projectId: clientProject, userId: client.id } });
  internalProject = (await prisma.project.create({ data: { tenantId, name: `${RUN} internal project` }, select: { id: true } })).id;
});

after(async () => {
  if (app) await app.close();
});

describe('a task inherits its project client scope', { skip }, () => {
  let taskId = '';

  it('is created with the scope of its client project', async () => {
    const res = await auth(ownerToken, request(server).post('/api/tasks')).send({ title: `${RUN} shared task`, projectId: clientProject });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    taskId = res.body.id;
    const row = await prisma.task.findUnique({ where: { id: taskId }, select: { clientScopeKey: true } });
    assert.equal(row.clientScopeKey, SCOPE);
  });

  it('reaches the client portal once it is shared, not before', async () => {
    let list = await auth(clientToken, request(server).get('/api/client/tasks'));
    assert.equal(list.status, 200);
    assert.ok(!list.body.some((t) => t.id === taskId), 'an unshared task must stay internal');

    const share = await auth(ownerToken, request(server).patch(`/api/tasks/${taskId}`)).send({ clientVisible: true });
    assert.equal(share.status, 200, JSON.stringify(share.body));

    list = await auth(clientToken, request(server).get('/api/client/tasks'));
    assert.ok(list.body.some((t) => t.id === taskId), `shared task missing from the client portal: ${JSON.stringify(list.body)}`);
    const one = await auth(clientToken, request(server).get(`/api/client/tasks/${taskId}`));
    assert.equal(one.status, 200, JSON.stringify(one.body));
  });

  it('leaves the client when moved to an internal project', async () => {
    const move = await auth(ownerToken, request(server).patch(`/api/tasks/${taskId}`)).send({ projectId: internalProject });
    assert.equal(move.status, 200, JSON.stringify(move.body));
    const row = await prisma.task.findUnique({ where: { id: taskId }, select: { clientScopeKey: true } });
    assert.equal(row.clientScopeKey, null);
    const one = await auth(clientToken, request(server).get(`/api/client/tasks/${taskId}`));
    assert.equal(one.status, 404, 'a task in an internal project must be absent for the client');
  });

  it('has no client scope without a project', async () => {
    const res = await auth(ownerToken, request(server).post('/api/tasks')).send({ title: `${RUN} loose task` });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const row = await prisma.task.findUnique({ where: { id: res.body.id }, select: { clientScopeKey: true } });
    assert.equal(row.clientScopeKey, null);
  });

  it('follows the project when its customer changes', async () => {
    const task = await auth(ownerToken, request(server).post('/api/tasks')).send({ title: `${RUN} moving task`, projectId: clientProject });
    assert.equal(task.status, 201, JSON.stringify(task.body));
    const unlink = await auth(ownerToken, request(server).patch(`/api/projects/${clientProject}`)).send({ customerId: null });
    assert.equal(unlink.status, 200, JSON.stringify(unlink.body));
    const row = await prisma.task.findUnique({ where: { id: task.body.id }, select: { clientScopeKey: true } });
    assert.equal(row.clientScopeKey, null, 'tasks must drop the scope with their project');
    const customer = await prisma.customer.findFirst({ where: { tenantId, clientScopeKey: SCOPE }, select: { id: true } });
    const relink = await auth(ownerToken, request(server).patch(`/api/projects/${clientProject}`)).send({ customerId: customer.id });
    assert.equal(relink.status, 200, JSON.stringify(relink.body));
    const again = await prisma.task.findUnique({ where: { id: task.body.id }, select: { clientScopeKey: true } });
    assert.equal(again.clientScopeKey, SCOPE, 'tasks must regain the scope with their project');
  });
});

describe('source guard', () => {
  it('tasks resolve the scope from the project, never from the request', () => {
    assert.match(src('modules/tasks/tasks.service.ts'), /private async projectScope\(/);
    assert.match(src('modules/tasks/tasks.service.ts'), /await this\.projectScope\(tenantId, dto\.projectId\)/);
    assert.match(src('modules/projects/projects.service.ts'), /this\.projectsRepository\.retagTasks\(tenantId, id, link\.clientScopeKey\)/);
    assert.doesNotMatch(src('modules/tasks/dto/create-task.dto.ts'), /clientScopeKey/);
  });
});
