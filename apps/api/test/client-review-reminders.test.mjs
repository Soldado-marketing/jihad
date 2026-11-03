/**
 * Client review deadlines (plan row D03): staff may give a delivery a review-by
 * time; the client sees it; while the delivery still waits for the client and
 * the time is within the next 24 hours, the client members of that delivery's
 * own scope are reminded once — never staff, never another client, never
 * another company. Real Nest HTTP + isolated test database.
 * Run with MAOS_INTEGRATION=1, DATABASE_URL and JWT_SECRET, after migrations.
 * Requires a TEST database only; never point this suite at production.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { before, after, describe, it } from 'node:test';

process.env.S3_BUCKET ||= 'review-reminders-test-bucket';
process.env.S3_REGION ||= 'eu-central-1';
process.env.S3_ACCESS_KEY_ID ||= 'reminders';
process.env.S3_SECRET_ACCESS_KEY ||= 'reminders';
process.env.S3_ENDPOINT = 'http://127.0.0.1:9';
process.env.S3_KEY_PREFIX = '';
process.env.S3_FORCE_PATH_STYLE = 'true';

const require = createRequire(import.meta.url);
const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const skip = process.env.MAOS_INTEGRATION !== '1' || !existsSync(join(apiRoot, 'dist/app.module.js'));
const RUN = 'rr' + Date.now().toString(36);
const PASSWORD = 'ReviewRemindersTest123!';
const HOUR = 3600 * 1000;
const at = (ms) => new Date(Date.now() + ms).toISOString();

let app, server, request, prisma, scheduler;
const co = {};
const p = {};
const rec = {};
const objects = new Map();

async function member(tenant, role, label, extra = {}) {
  const bcrypt = require('bcrypt');
  const user = await prisma.user.create({
    data: { email: `${label}-${RUN}@example.test`, displayName: `${label} Person ${RUN}`, passwordHash: await bcrypt.hash(PASSWORD, 10), status: 'APPROVED' },
  });
  await prisma.tenantMembership.create({ data: { tenantId: tenant.id, userId: user.id, role, status: 'ACTIVE', ...extra } });
  return { id: user.id, email: user.email, name: user.displayName };
}
let ip = 0;
async function login(person, tenant) {
  const res = await request(server).post('/api/auth/login').set('X-Forwarded-For', `198.51.100.${++ip}`).send({ email: person.email, passwordOrMagicCode: PASSWORD, tenantSlug: tenant.slug });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.tokens.accessToken;
}
const call = (token, method, path, body) => {
  const req = request(server)[method](path).set('Authorization', `Bearer ${token}`);
  return body ? req.send(body) : req;
};
const pdfBytes = () => Buffer.from('%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n', 'latin1');
async function fileWithVersion(tenant, label, links) {
  const asset = await prisma.fileAsset.create({ data: { tenantId: tenant.id, name: `${label} ${RUN}.pdf`, mimeType: 'application/pdf', versionCount: 1, ...links } });
  const version = await prisma.fileVersion.create({
    data: { tenantId: tenant.id, fileAssetId: asset.id, versionNumber: 1, originalName: `${label}-v1.pdf`, sizeBytes: 100, storageKey: `tenants/${tenant.id}/files/${asset.id}/v1/${label}.pdf` },
  });
  objects.set(version.storageKey, pdfBytes());
  return { asset, version };
}
const submit = (token, file, extra = {}) => call(token, 'post', '/api/deliveries', { fileAssetId: file.asset.id, fileVersionId: file.version.id, ...extra });

/** Reminders written for one delivery, per recipient. */
const reminders = (deliveryId) => prisma.notification.findMany({ where: { resourceId: deliveryId, title: { contains: 'waiting for your review' } }, select: { recipientUserId: true, title: true, body: true, tenantId: true } });
/** Reminders for every delivery of this run's companies (tenant-scoped, so sibling suites cannot move the count). */
const ourReminders = () => prisma.notification.count({ where: { tenantId: { in: [co.a.id, co.b.id] }, title: { contains: 'waiting for your review' } } });
async function run() {
  for (let i = 0; i < 40; i++) {
    const r = await scheduler.runNow('client-review-reminders');
    if (r.outcome === 'succeeded') return r.affected;
    if (r.outcome !== 'skipped_locked' && r.outcome !== 'skipped_running') assert.fail(JSON.stringify(r));
    await new Promise((res) => setTimeout(res, 250));
  }
  assert.fail('the job stayed locked');
}

before(async () => {
  if (skip) return;
  require('reflect-metadata');
  const { NestFactory } = require('@nestjs/core');
  const { ValidationPipe } = require('@nestjs/common');
  const { AppModule } = require(join(apiRoot, 'dist/app.module.js'));
  const { AllExceptionsFilter } = require(join(apiRoot, 'dist/common/http/all-exceptions.filter.js'));
  app = await NestFactory.create(AppModule, { logger: false });
  require(join(apiRoot, 'dist/common/http/trust-proxy.js')).configureTrustProxy(app, {});
  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));
  await app.init();
  await app.listen(0, '127.0.0.1');
  server = app.getHttpServer();
  request = require('supertest');
  const { PrismaService } = require(join(apiRoot, 'dist/modules/prisma/prisma.service.js'));
  const { SchedulerService } = require(join(apiRoot, 'dist/modules/scheduler/scheduler.service.js'));
  prisma = app.get(PrismaService);
  scheduler = app.get(SchedulerService);
  const { StorageService } = require(join(apiRoot, 'dist/modules/storage/storage.service.js'));
  const { Readable } = require('node:stream');
  app.get(StorageService).getObjectStream = async (key) => {
    const body = objects.get(key);
    if (!body) throw new Error('no such object');
    return { stream: Readable.from([body]), contentLength: body.length, contentType: 'application/pdf' };
  };

  co.a = await prisma.tenant.create({ data: { name: `Agency A ${RUN}`, slug: `${RUN}-a`, status: 'ACTIVE' } });
  co.b = await prisma.tenant.create({ data: { name: `Agency B ${RUN}`, slug: `${RUN}-b`, status: 'ACTIVE' } });
  p.owner = await member(co.a, 'OWNER', 'owner');
  p.manager = await member(co.a, 'MANAGER', 'manager');
  p.employee = await member(co.a, 'EMPLOYEE', 'employee');
  p.clientX = await member(co.a, 'CLIENT', 'clientx', { clientScopeKey: `x-${RUN}`, visibilityScope: 'CLIENT_LEVEL' });
  p.clientX2 = await member(co.a, 'CLIENT', 'clientx2', { clientScopeKey: `x-${RUN}`, visibilityScope: 'CLIENT_LEVEL' });
  p.clientY = await member(co.a, 'CLIENT', 'clienty', { clientScopeKey: `y-${RUN}`, visibilityScope: 'CLIENT_LEVEL' });
  p.ownerB = await member(co.b, 'OWNER', 'ownerb');
  p.clientB = await member(co.b, 'CLIENT', 'clientb', { clientScopeKey: `x-${RUN}`, visibilityScope: 'CLIENT_LEVEL' });

  const custX = await prisma.customer.create({ data: { tenantId: co.a.id, name: `Customer X ${RUN}`, clientScopeKey: `x-${RUN}` } });
  const projX = await prisma.project.create({ data: { tenantId: co.a.id, name: `Project X ${RUN}`, status: 'ACTIVE', customerId: custX.id, clientScopeKey: `x-${RUN}`, clientVisible: true } });
  const taskOf = (label) => prisma.task.create({ data: { tenantId: co.a.id, projectId: projX.id, title: `${label} ${RUN}`, assignedToUserId: p.employee.id } });
  rec.soon = await fileWithVersion(co.a, 'soon', { taskId: (await taskOf('Soon')).id });
  rec.far = await fileWithVersion(co.a, 'far', { taskId: (await taskOf('Far')).id });
  rec.none = await fileWithVersion(co.a, 'none', { taskId: (await taskOf('None')).id });
  rec.approved = await fileWithVersion(co.a, 'approved', { taskId: (await taskOf('Approved')).id });
  rec.past = await fileWithVersion(co.a, 'past', { taskId: (await taskOf('Past')).id });

  const custB = await prisma.customer.create({ data: { tenantId: co.b.id, name: `Customer B ${RUN}`, clientScopeKey: `x-${RUN}` } });
  const projB = await prisma.project.create({ data: { tenantId: co.b.id, name: `Project B ${RUN}`, status: 'ACTIVE', customerId: custB.id, clientScopeKey: `x-${RUN}`, clientVisible: true } });
  rec.b = await fileWithVersion(co.b, 'bfile', { projectId: projB.id });

  for (const k of ['owner', 'manager', 'employee', 'clientX', 'clientX2', 'clientY']) p[k + 'Token'] = await login(p[k], co.a);
  p.ownerBToken = await login(p.ownerB, co.b);
  p.clientBToken = await login(p.clientB, co.b);
});
after(async () => { if (app) await app.close(); });

describe('Review deadline: setting it', { skip }, () => {
  it('a review-by time in the past, or not a date, is refused and nothing is created', async () => {
    const before = await prisma.approvalRequest.count({ where: { tenantId: co.a.id } });
    const past = await submit(p.employeeToken, rec.past, { reviewBy: at(-HOUR) });
    assert.equal(past.status, 400, JSON.stringify(past.body));
    assert.equal(past.body.code ?? past.body.message?.code, 'REVIEW_BY_IN_PAST');
    const junk = await submit(p.employeeToken, rec.past, { reviewBy: 'next tuesday' });
    assert.equal(junk.status, 400);
    assert.equal(await prisma.approvalRequest.count({ where: { tenantId: co.a.id } }), before);
  });

  it('a delivery with a review-by time stores it; the client and staff read it, without any staff identity', async () => {
    const soon = await submit(p.employeeToken, rec.soon, { reviewBy: at(20 * HOUR), message: 'Please have a look' });
    assert.equal(soon.status, 201, JSON.stringify(soon.body));
    rec.soonId = soon.body.id;
    assert.ok(soon.body.reviewBy, 'reviewBy returned');
    const row = await prisma.approvalRequest.findUnique({ where: { id: rec.soonId }, select: { dueAt: true, status: true } });
    assert.ok(row.dueAt instanceof Date);
    assert.equal(row.status, 'REQUESTED');

    const detail = await call(p.clientXToken, 'get', `/api/client/deliveries/${rec.soonId}`);
    assert.equal(detail.status, 200);
    assert.equal(new Date(detail.body.reviewBy).getTime(), row.dueAt.getTime());
    const list = await call(p.clientXToken, 'get', '/api/client/deliveries');
    assert.equal(new Date(list.body.find((d) => d.id === rec.soonId).reviewBy).getTime(), row.dueAt.getTime());
    const text = JSON.stringify(detail.body) + JSON.stringify(list.body);
    for (const who of [p.employee, p.manager, p.owner]) assert.ok(!text.includes(who.id) && !text.includes(who.name) && !text.includes(who.email), 'staff identity leaked');

    const rounds = await call(p.ownerToken, 'get', `/api/deliveries/file/${rec.soon.asset.id}`);
    assert.equal(rounds.status, 200);
    assert.equal(new Date(rounds.body[0].dueAt).getTime(), row.dueAt.getTime());

    // The delivery notice itself tells the client the date.
    const notice = await prisma.notification.findFirst({ where: { recipientUserId: p.clientX.id, resourceId: rec.soonId, title: { contains: 'ready for your review' } } });
    assert.match(notice.body, /please review by/);
  });

  it('a delivery without a review-by time stays as before', async () => {
    const none = await submit(p.employeeToken, rec.none);
    assert.equal(none.status, 201, JSON.stringify(none.body));
    rec.noneId = none.body.id;
    assert.equal(none.body.reviewBy, null);
    const detail = await call(p.clientXToken, 'get', `/api/client/deliveries/${rec.noneId}`);
    assert.equal(detail.body.reviewBy, null);
  });
});

describe('Review deadline: the reminder', { skip }, () => {
  it('is registered on the scheduler', () => {
    assert.ok(scheduler.status().some((s) => s.name === 'client-review-reminders'));
  });

  it('reaches the client members of that scope once, 24 h before, and nobody else', async () => {
    const far = await submit(p.employeeToken, rec.far, { reviewBy: at(72 * HOUR) });
    assert.equal(far.status, 201, JSON.stringify(far.body));
    rec.farId = far.body.id;
    const approved = await submit(p.employeeToken, rec.approved, { reviewBy: at(20 * HOUR) });
    assert.equal(approved.status, 201, JSON.stringify(approved.body));
    rec.approvedId = approved.body.id;
    const ok = await call(p.clientXToken, 'post', `/api/client/deliveries/${rec.approvedId}/decision`, { decision: 'APPROVE' });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    const b = await submit(p.ownerBToken, rec.b, { reviewBy: at(20 * HOUR) });
    assert.equal(b.status, 201, JSON.stringify(b.body));
    rec.bId = b.body.id;

    const before = await ourReminders();
    await run();
    assert.equal((await ourReminders()) - before, 3, 'client X, client X2 (same scope) and company B client');

    const soon = await reminders(rec.soonId);
    assert.deepEqual(soon.map((n) => n.recipientUserId).sort(), [p.clientX.id, p.clientX2.id].sort());
    for (const n of soon) {
      assert.equal(n.tenantId, co.a.id);
      assert.match(n.body, /please review by/);
      for (const who of [p.employee, p.manager, p.owner]) assert.ok(!n.body.includes(who.name) && !n.title.includes(who.name), 'staff identity in a reminder');
    }
    assert.equal((await reminders(rec.farId)).length, 0, 'three days away: not yet');
    assert.equal((await reminders(rec.approvedId)).length, 0, 'already approved: nothing to remind');
    assert.equal((await reminders(rec.noneId)).length, 0, 'no review-by time: no reminder');
    const bRows = await reminders(rec.bId);
    assert.deepEqual(bRows.map((n) => n.recipientUserId), [p.clientB.id], 'company B reminds its own client only');
    assert.equal(bRows[0].tenantId, co.b.id);
    assert.equal(await prisma.notification.count({ where: { recipientUserId: { in: [p.employee.id, p.manager.id, p.owner.id, p.clientY.id, p.ownerB.id] }, title: { contains: 'waiting for your review' } } }), 0);
  });

  it('a second run adds nothing for the same time', async () => {
    const before = await ourReminders();
    await run();
    assert.equal(await ourReminders(), before);
  });

  it('after the client asked for changes the delivery is no longer reminded', async () => {
    const changes = await call(p.clientXToken, 'post', `/api/client/deliveries/${rec.soonId}/decision`, { decision: 'REQUEST_CHANGES', note: 'Logo is too small' });
    assert.equal(changes.status, 200, JSON.stringify(changes.body));
    await prisma.notification.deleteMany({ where: { resourceId: rec.soonId, title: { contains: 'waiting for your review' } } });
    const before = await ourReminders();
    await run();
    assert.equal(await ourReminders(), before);
    assert.equal((await reminders(rec.soonId)).length, 0);
  });
});
