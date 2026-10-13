/**
 * Approval decisions only on open approvals (MAOS-T108).
 *
 * A decision used to be recorded on any approval, even one already approved
 * or rejected, and two people deciding at once both succeeded. Now only an
 * open approval (REQUESTED or CHANGES_REQUESTED) can be decided; the status
 * check and change are one conditional write, so concurrent deciders get
 * exactly one success and the rest 409 APPROVAL_ALREADY_DECIDED.
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

const RUN = `ad${Date.now().toString(36)}`;
const PASSWORD = 'DecidePass123!';

let app;
let server;
let request;
let prisma;
let token = '';
let tenantId = '';
let n = 0;

async function pendingRequest(requestedRole) {
  n += 1;
  const user = await prisma.user.create({
    data: {
      email: `applicant${n}-${RUN}@example.test`,
      displayName: `applicant ${n}`,
      status: 'PENDING_APPROVAL',
      passwordHash: await require('bcrypt').hash(PASSWORD, 10),
    },
    select: { id: true },
  });
  const req = await prisma.registrationRequest.create({
    data: { userId: user.id, tenantId, fullName: `Applicant ${n}`, requestedRole },
    select: { id: true },
  });
  return { userId: user.id, requestId: req.id, email: `applicant${n}-${RUN}@example.test` };
}

const approve = (requestId, body) =>
  request(server).post(`/api/admin/users/requests/${requestId}/approve`).set('Authorization', `Bearer ${token}`).send(body);


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

  const bcrypt = require('bcrypt');
  const hash = await bcrypt.hash(PASSWORD, 10);
  const tenant = await prisma.tenant.create({ data: { name: `Tenant ${RUN}`, slug: `tenant-${RUN}`, status: 'ACTIVE' }, select: { id: true } });
  tenantId = tenant.id;
  const other = await prisma.tenant.create({ data: { name: `Other ${RUN}`, slug: `other-${RUN}`, status: 'ACTIVE' }, select: { id: true } });

  async function member(tid, slug, label, role, clientScopeKey) {
    const email = `${label}-${RUN}@example.test`;
    const user = await prisma.user.create({ data: { email, displayName: label, passwordHash: hash, status: 'APPROVED' }, select: { id: true } });
    await prisma.tenantMembership.create({
      data: { tenantId: tid, userId: user.id, role, status: 'ACTIVE', visibilityScope: 'TENANT_WIDE', clientScopeKey },
    });
    const res = await request(server).post('/api/auth/login').send({ email, passwordOrMagicCode: PASSWORD, tenantSlug: slug });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return { id: user.id, token: res.body.tokens.accessToken };
  }
  for (const [label, role, key] of [
    ['owner', 'OWNER'],
    ['manager', 'MANAGER'],
    ['employee', 'EMPLOYEE'],
    ['contractor', 'CONTRACTOR'],
    ['client', 'CLIENT', `acme-${RUN}`],
  ]) {
    people[label] = await member(tenantId, `tenant-${RUN}`, label, role, key);
  }
  people.foreign = await member(other.id, `other-${RUN}`, 'foreign', 'OWNER');
  token = people.owner.token;
});

after(async () => {
  if (app) await app.close();
});

const people = {};
const as = (who, req) => req.set('Authorization', `Bearer ${people[who].token}`);
const bell = async (who) => {
  const res = await as(who, request(server).get('/api/notifications'));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body;
};
const about = async (who, resourceType, resourceId) =>
  (await bell(who)).filter((n) => n.resourceType === resourceType && (!resourceId || n.resourceId === resourceId));

let seq = 0;
const newApproval = async (status = 'REQUESTED') => {
  seq += 1;
  return (await prisma.approvalRequest.create({ data: { tenantId, title: `Approval ${seq} ${RUN}`, status }, select: { id: true } })).id;
};
const decide = (who, id, decision) => as(who, request(server).post(`/api/approvals/${id}/decision`)).send({ decision });
const state = async (id) => ({
  status: (await prisma.approvalRequest.findUnique({ where: { id }, select: { status: true } })).status,
  decisions: await prisma.approvalDecision.count({ where: { approvalRequestId: id } }),
});

describe('approval decisions', { skip }, () => {
  it('decides an open approval once and refuses a second decision', async () => {
    const id = await newApproval();
    assert.equal((await decide('owner', id, 'APPROVE')).status, 201);
    const again = await decide('manager', id, 'REJECT');
    assert.equal(again.status, 409, JSON.stringify(again.body));
    assert.match(JSON.stringify(again.body), /APPROVAL_ALREADY_DECIDED/);
    assert.deepEqual(await state(id), { status: 'APPROVED', decisions: 1 });
  });

  it('lets an approval with changes requested be decided again', async () => {
    const id = await newApproval();
    assert.equal((await decide('owner', id, 'REQUEST_CHANGES')).status, 201);
    assert.equal((await decide('owner', id, 'APPROVE')).status, 201);
    assert.deepEqual(await state(id), { status: 'APPROVED', decisions: 2 });
  });

  it('refuses decisions on cancelled and rejected approvals', async () => {
    for (const status of ['CANCELED', 'REJECTED']) {
      const id = await newApproval(status);
      assert.equal((await decide('owner', id, 'APPROVE')).status, 409, status);
      assert.deepEqual(await state(id), { status, decisions: 0 });
    }
  });

  it('records exactly one of several concurrent final decisions', async () => {
    // Only decisions that close the approval: REQUEST_CHANGES keeps it open by
    // design, so a REQUEST_CHANGES followed by APPROVE is legitimately two.
    const id = await newApproval();
    const results = await Promise.all([
      decide('owner', id, 'APPROVE'),
      decide('manager', id, 'REJECT'),
      decide('owner', id, 'CANCEL'),
    ]);
    const codes = results.map((r) => r.status).sort();
    assert.deepEqual(codes, [201, 409, 409], JSON.stringify(results.map((r) => r.body)));
    assert.equal((await state(id)).decisions, 1);
  });

  it('answers 404 for another tenant\'s approval', async () => {
    const foreignId = (await prisma.approvalRequest.create({
      data: { tenantId: (await prisma.tenant.findFirst({ where: { slug: `other-${RUN}` }, select: { id: true } })).id, title: `Foreign ${RUN}` },
      select: { id: true },
    })).id;
    assert.equal((await decide('owner', foreignId, 'APPROVE')).status, 404);
    assert.equal((await state(foreignId)).decisions, 0);
  });
});
