/**
 * Global search (MAOS-T63): permission-aware search over customers,
 * projects, tasks and files. Never returns another tenant's rows, rows
 * outside a contractor's assigned work, or a type the caller may not read.
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

const RUN = `gs${Date.now().toString(36)}`;
const PASSWORD = 'SearchPass123!';
const WORD = `zebra${RUN}`;

let app;
let server;
let request;
let prisma;
const t = {};
const u = {};
const ids = {};

const search = (who, qs) => request(server).get(`/api/search?${qs}`).set('Authorization', `Bearer ${u[who].token}`);
const idsOf = (res, type) => (res.body.results[type] ?? []).map((r) => r.id).sort();

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
  // Listen once on IPv4 loopback (CI-2): supertest otherwise re-listens on a
  // fresh ephemeral port per request, and on a developer machine another
  // local process occasionally answered that port.
  await app.listen(0, '127.0.0.1');
  server = app.getHttpServer();
  request = require('supertest');
  const { PrismaService } = require(join(apiRoot, 'dist/modules/prisma/prisma.service.js'));
  prisma = app.get(PrismaService);

  const hash = await require('bcrypt').hash(PASSWORD, 10);
  for (const n of ['a', 'b']) t[n] = await prisma.tenant.create({ data: { name: `S${n} ${RUN}`, slug: `s${n}-${RUN}`, status: 'ACTIVE' } });
  async function member(tenant, label, role, clientScopeKey = null) {
    const email = `${label}-${RUN}@example.test`;
    const user = await prisma.user.create({ data: { email, displayName: label, passwordHash: hash, status: 'APPROVED' } });
    await prisma.tenantMembership.create({ data: { tenantId: t[tenant].id, userId: user.id, role, status: 'ACTIVE', visibilityScope: 'TENANT_WIDE', clientScopeKey } });
    const res = await request(server).post('/api/auth/login').send({ email, passwordOrMagicCode: PASSWORD, tenantSlug: `s${tenant}-${RUN}` });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return { id: user.id, token: res.body.tokens.accessToken };
  }
  u.owner = await member('a', 'owner', 'OWNER');
  u.manager = await member('a', 'manager', 'MANAGER');
  u.employee = await member('a', 'employee', 'EMPLOYEE');
  u.contractor = await member('a', 'contractor', 'CONTRACTOR');
  u.client = await member('a', 'client', 'CLIENT', `k-${RUN}`);
  u.foreign = await member('b', 'foreign', 'OWNER');

  const A = t.a.id;
  ids.customer = (await prisma.customer.create({ data: { tenantId: A, clientScopeKey: `k-${RUN}`, name: `Acme ${WORD}` } })).id;
  ids.assignedProject = (await prisma.project.create({ data: { tenantId: A, name: `Site ${WORD}` } })).id;
  ids.otherProject = (await prisma.project.create({ data: { tenantId: A, name: `Brand ${WORD}` } })).id;
  ids.assignedTask = (await prisma.task.create({ data: { tenantId: A, projectId: ids.assignedProject, title: `Fix ${WORD}`, assignedToUserId: u.contractor.id } })).id;
  ids.otherTask = (await prisma.task.create({ data: { tenantId: A, projectId: ids.otherProject, title: `Plan ${WORD}` } })).id;
  // Attached to the contractor's task: a contractor who is not a project member sees
  // the files of their tasks, not project-level files (same rule as the files list).
  ids.assignedFile = (await prisma.fileAsset.create({ data: { tenantId: A, projectId: ids.assignedProject, taskId: ids.assignedTask, name: `${WORD}-brief.pdf` } })).id;
  ids.otherFile = (await prisma.fileAsset.create({ data: { tenantId: A, projectId: ids.otherProject, name: `${WORD}-budget.xlsx` } })).id;
  // The same word in tenant b.
  const B = t.b.id;
  ids.foreignProject = (await prisma.project.create({ data: { tenantId: B, name: `Foreign ${WORD}` } })).id;
  await prisma.customer.create({ data: { tenantId: B, clientScopeKey: `k-${RUN}`, name: `Foreign Acme ${WORD}` } });
  await prisma.task.create({ data: { tenantId: B, title: `Foreign task ${WORD}` } });
  await prisma.fileAsset.create({ data: { tenantId: B, name: `${WORD}-foreign.pdf` } });
});

after(async () => {
  if (app) await app.close();
});

describe('global search (MAOS-T63)', { skip }, () => {
  it('OWNER finds every type in its own tenant only, case-insensitively', async () => {
    const res = await search('owner', `q=${WORD.toUpperCase()}`);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(res.body.types, ['customers', 'projects', 'tasks', 'files']);
    assert.deepEqual(idsOf(res, 'customers'), [ids.customer]);
    assert.deepEqual(idsOf(res, 'projects'), [ids.assignedProject, ids.otherProject].sort());
    assert.deepEqual(idsOf(res, 'tasks'), [ids.assignedTask, ids.otherTask].sort());
    assert.deepEqual(idsOf(res, 'files'), [ids.assignedFile, ids.otherFile].sort());
    assert.ok(!JSON.stringify(res.body).includes('Foreign'), 'nothing from the other tenant');
  });

  it('results carry identifiers and titles only', async () => {
    const res = await search('owner', `q=${WORD}`);
    assert.deepEqual(Object.keys(res.body.results.customers[0]).sort(), ['id', 'name', 'status']);
    assert.deepEqual(Object.keys(res.body.results.files[0]).sort(), ['id', 'name', 'projectId']);
  });

  it('a CONTRACTOR finds only assigned work and no customers', async () => {
    const res = await search('contractor', `q=${WORD}`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.types, ['projects', 'tasks', 'files'], 'CUSTOMER is not readable by default');
    assert.equal(res.body.results.customers, undefined);
    assert.deepEqual(idsOf(res, 'projects'), [ids.assignedProject]);
    assert.deepEqual(idsOf(res, 'tasks'), [ids.assignedTask]);
    assert.deepEqual(idsOf(res, 'files'), [ids.assignedFile]);
  });

  it('a revoked permission removes that type immediately', async () => {
    const m = await prisma.tenantMembership.findFirst({ where: { tenantId: t.a.id, userId: u.employee.id } });
    await prisma.membershipPermission.create({ data: { membershipId: m.id, action: 'read', resource: 'customer', granted: false } });
    const res = await search('employee', `q=${WORD}`);
    assert.ok(!res.body.types.includes('customers'));
    assert.equal(res.body.results.customers, undefined);
  });

  it('CLIENT and anonymous callers are refused', async () => {
    assert.equal((await search('client', `q=${WORD}`)).status, 403);
    assert.equal((await request(server).get(`/api/search?q=${WORD}`)).status, 401);
  });

  it('validates the query, types and limit', async () => {
    for (const qs of ['q=a', `q=${'x'.repeat(101)}`, 'q=ok&types=customers,secrets', 'q=ok&limit=0', 'q=ok&limit=26', 'q=ok&limit=x', '']) {
      assert.equal((await search('owner', qs)).status, 400, qs);
    }
    const limited = await search('owner', `q=${WORD}&types=projects&limit=1`);
    assert.deepEqual(limited.body.types, ['projects']);
    assert.equal(limited.body.results.projects.length, 1);
  });
});
