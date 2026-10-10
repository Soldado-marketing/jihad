/**
 * Security gate - foreign IDs in files, approvals, chat, voice notes and
 * internal notes are tenant-validated (MAOS-T28).
 *
 * Continues MAOS-T27 for the content domains. Before this gate a member of
 * tenant A could attach a file or voice note to tenant B's project or task,
 * open an approval on tenant B's file or version, post into tenant B's chat
 * channel, or hang an internal note on any ID under any free-form type. These
 * tests drive the real app over HTTP and prove every such reference must
 * belong to the caller's tenant, nothing is written when it does not, and the
 * refusal does not reveal whether the ID exists elsewhere. Chat and note
 * bodies are now validated by their DTO classes too.
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

const RUN = `fc${Date.now().toString(36)}`;
const PASSWORD = 'ForeignContentPass123!';

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
  home.project = await prisma.project.create({ data: { tenantId: t1.id, name: `Home project ${RUN}` }, select: { id: true } });
  home.task = await prisma.task.create({ data: { tenantId: t1.id, title: `Home task ${RUN}` }, select: { id: true } });
  home.file = await prisma.fileAsset.create({ data: { tenantId: t1.id, name: `home-${RUN}.pdf` }, select: { id: true } });
  home.version = await prisma.fileVersion.create({ data: { tenantId: t1.id, fileAssetId: home.file.id, versionNumber: 1 }, select: { id: true } });
  home.otherFile = await prisma.fileAsset.create({ data: { tenantId: t1.id, name: `home-other-${RUN}.pdf` }, select: { id: true } });
  home.otherVersion = await prisma.fileVersion.create({ data: { tenantId: t1.id, fileAssetId: home.otherFile.id, versionNumber: 1 }, select: { id: true } });
  home.channel = await prisma.chatChannel.create({ data: { tenantId: t1.id, name: `Home channel ${RUN}` }, select: { id: true } });

  const t2 = await seedTenant('foreign');
  foreign.tenantId = t2.id;
  foreign.user = await seedUser(t2.id, 'stranger', 'EMPLOYEE');
  foreign.project = await prisma.project.create({ data: { tenantId: t2.id, name: `Foreign project ${RUN}` }, select: { id: true } });
  foreign.task = await prisma.task.create({ data: { tenantId: t2.id, title: `Foreign task ${RUN}` }, select: { id: true } });
  foreign.file = await prisma.fileAsset.create({ data: { tenantId: t2.id, name: `foreign-${RUN}.pdf` }, select: { id: true } });
  foreign.version = await prisma.fileVersion.create({ data: { tenantId: t2.id, fileAssetId: foreign.file.id, versionNumber: 1 }, select: { id: true } });
  foreign.channel = await prisma.chatChannel.create({ data: { tenantId: t2.id, name: `Foreign channel ${RUN}` }, select: { id: true } });

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
  assert.ok(!/foreign|Foreign|stranger/.test(body.replace(/"field":"\w+"/g, '')), 'refusal leaked foreign data');
}

function assertInvalidReference(res, field) {
  assert.equal(res.status, 400, JSON.stringify(res.body));
  assert.match(JSON.stringify(res.body), /INVALID_REFERENCE/);
  assert.match(JSON.stringify(res.body), new RegExp(field));
}

const count = (model, where) => prisma[model].count({ where: { tenantId: home.tenantId, ...where } });

describe('Gate - files', { skip }, () => {
  const create = (extra) => as(request(server).post('/api/files')).send({ name: `f-${RUN}.pdf`, ...extra });

  it('refuses a foreign project and writes nothing', async () => {
    const before = await count('fileAsset', {});
    const res = await create({ projectId: foreign.project.id });
    assertInvalidReference(res, 'projectId');
    assertNonLeaking(res, foreign.project.id);
    assert.equal(await count('fileAsset', {}), before);
  });

  it('refuses a foreign task and a non-existent task the same way', async () => {
    const a = await create({ taskId: foreign.task.id });
    const b = await create({ taskId: NON_EXISTENT });
    assertInvalidReference(a, 'taskId');
    const { requestId: _a, ...bodyA } = a.body;
    const { requestId: _b, ...bodyB } = b.body;
    assert.deepEqual(bodyA, bodyB);
  });

  it('accepts a same-tenant project and task (control)', async () => {
    const res = await create({ projectId: home.project.id, taskId: home.task.id });
    assert.equal(res.status, 201, JSON.stringify(res.body));
  });
});

describe('Gate - approvals', { skip }, () => {
  const create = (extra) => as(request(server).post('/api/approvals')).send({ title: `Approve ${RUN}`, ...extra });

  it('refuses a foreign file and writes nothing', async () => {
    const before = await count('approvalRequest', {});
    const res = await create({ fileAssetId: foreign.file.id });
    assertInvalidReference(res, 'fileAssetId');
    assertNonLeaking(res, foreign.file.id);
    assert.equal(await count('approvalRequest', {}), before);
  });

  it('refuses a foreign file version', async () => {
    assertInvalidReference(await create({ fileVersionId: foreign.version.id }), 'fileVersionId');
  });

  it("refuses pairing a file with another file's version", async () => {
    assertInvalidReference(await create({ fileAssetId: home.file.id, fileVersionId: home.otherVersion.id }), 'fileVersionId');
  });

  it('accepts a same-tenant file with its own version (control)', async () => {
    const res = await create({ fileAssetId: home.file.id, fileVersionId: home.version.id });
    assert.equal(res.status, 201, JSON.stringify(res.body));
  });
});

describe('Gate - voice notes', { skip }, () => {
  const create = (extra) => as(request(server).post('/api/voice-notes')).send({ title: `Voice ${RUN}`, ...extra });

  it('refuses a foreign project and a foreign task, writing nothing', async () => {
    const before = await count('voiceNote', {});
    assertInvalidReference(await create({ projectId: foreign.project.id }), 'projectId');
    assertInvalidReference(await create({ taskId: foreign.task.id }), 'taskId');
    assert.equal(await count('voiceNote', {}), before);
  });

  it('rejects an invalid body now that the DTO is enforced', async () => {
    assert.equal((await create({ title: 'x' })).status, 400);
  });

  it('accepts a same-tenant project and task (control)', async () => {
    const res = await create({ projectId: home.project.id, taskId: home.task.id });
    assert.equal(res.status, 201, JSON.stringify(res.body));
  });
});

describe('Gate - internal notes', { skip }, () => {
  const create = (extra) => as(request(server).post('/api/collaboration/notes')).send({ body: `Note ${RUN}`, ...extra });

  it('refuses a foreign task, project and file and writes nothing', async () => {
    const before = await count('internalNote', {});
    assertInvalidReference(await create({ resourceType: 'task', resourceId: foreign.task.id }), 'resourceId');
    assertInvalidReference(await create({ resourceType: 'project', resourceId: foreign.project.id }), 'resourceId');
    assertInvalidReference(await create({ resourceType: 'file', resourceId: foreign.file.id }), 'resourceId');
    assert.equal(await count('internalNote', {}), before);
  });

  it('refuses a resourceId whose type cannot be checked', async () => {
    assertInvalidReference(await create({ resourceId: home.task.id }), 'resourceType');
    assert.equal((await create({ resourceType: 'invoice', resourceId: home.task.id })).status, 400);
  });

  it('accepts a same-tenant task note, as the task modal sends it (control)', async () => {
    const res = await create({ resourceType: 'task', resourceId: home.task.id });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const list = await as(request(server).get(`/api/collaboration/notes?resourceType=task&resourceId=${home.task.id}`));
    assert.equal(list.status, 200);
  });

  it('accepts a note without a resource (control)', async () => {
    assert.equal((await create({})).status, 201);
  });
});

describe('Gate - chat', { skip }, () => {
  const post = (channelId, body = `Hello ${RUN}`) =>
    as(request(server).post(`/api/chat/channels/${channelId}/messages`)).send({ body });

  it("refuses to post into another tenant's channel (404) and writes nothing", async () => {
    const res = await post(foreign.channel.id);
    assert.equal(res.status, 404, JSON.stringify(res.body));
    assertNonLeaking(res, foreign.channel.id);
    assert.equal(await prisma.chatMessage.count({ where: { channelId: foreign.channel.id } }), 0);
  });

  it("answers 404 for another tenant's channel messages", async () => {
    const res = await as(request(server).get(`/api/chat/channels/${foreign.channel.id}/messages`));
    assert.equal(res.status, 404);
  });

  it('rejects an empty message body now that the DTO is enforced', async () => {
    assert.equal((await post(home.channel.id, '')).status, 400);
  });

  it('posts into a same-tenant channel (control)', async () => {
    const res = await post(home.channel.id);
    assert.equal(res.status, 201, JSON.stringify(res.body));
  });
});
