/**
 * Client delivery, feedback and approval (owner decision 2026-11-02): the
 * assigned employee sends a file version to the client, the client approves or
 * requests changes, a change request goes straight to that employee, who
 * resubmits. Clients see only their own deliveries and only the company's
 * name, never a staff identity. Real Nest HTTP + isolated test database.
 * Run with MAOS_INTEGRATION=1, DATABASE_URL and JWT_SECRET, after migrations.
 * Requires a TEST database only; never point this suite at production.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { before, after, describe, it } from 'node:test';

// Storage is unroutable on purpose: content routes are checked for
// authorisation only (a refused request is 403, an allowed one is not).
process.env.S3_BUCKET ||= 'deliveries-test-bucket';
process.env.S3_REGION ||= 'eu-central-1';
process.env.S3_ACCESS_KEY_ID ||= 'deliveries';
process.env.S3_SECRET_ACCESS_KEY ||= 'deliveries';
process.env.S3_ENDPOINT = 'http://127.0.0.1:9';
process.env.S3_KEY_PREFIX = '';
process.env.S3_FORCE_PATH_STYLE = 'true';

const require = createRequire(import.meta.url);
const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const skip = process.env.MAOS_INTEGRATION !== '1' || !existsSync(join(apiRoot, 'dist/app.module.js'));
const RUN = 'cd' + Date.now().toString(36);
const PASSWORD = 'ClientDeliveriesTest123!';

let app, server, request, prisma;
const co = {};
const p = {};
const rec = {};

async function member(tenant, role, label, extra = {}) {
  const bcrypt = require('bcrypt');
  const user = await prisma.user.create({
    data: { email: `${label}-${RUN}@example.test`, displayName: `${label} Person ${RUN}`, passwordHash: await bcrypt.hash(PASSWORD, 10), status: 'APPROVED' },
  });
  await prisma.tenantMembership.create({ data: { tenantId: tenant.id, userId: user.id, role, status: 'ACTIVE', ...extra } });
  return { id: user.id, email: user.email, name: user.displayName };
}
// Each sign-in gets its own client address, so the per-client login limit never bites.
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
// Stored objects for this suite (the real bucket is unroutable): one clean PDF per key unless set otherwise.
const objects = new Map();
const pdfBytes = (label) => Buffer.from(`%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n3 0 obj << /Author (${label}) /Producer (Tool) >> endobj\ntrailer << /Root 1 0 R /Info 3 0 R >>\n%%EOF\n`, 'latin1');
const submit = (token, file, version, message) => call(token, 'post', '/api/deliveries', { fileAssetId: file.id, fileVersionId: version.id, ...(message ? { message } : {}) });
const content = (token, file, version) => call(token, 'get', `/api/client/files/${file.id}/versions/${version.id}/content`);
async function fileWithVersions(tenant, label, links, count) {
  const asset = await prisma.fileAsset.create({ data: { tenantId: tenant.id, name: `${label} ${RUN}.pdf`, mimeType: 'application/pdf', versionCount: count, ...links } });
  const versions = [];
  for (let n = 1; n <= count; n++) {
    versions.push(await prisma.fileVersion.create({
      data: { tenantId: tenant.id, fileAssetId: asset.id, versionNumber: n, originalName: `${label}-v${n}.pdf`, sizeBytes: 100, storageKey: `tenants/${tenant.id}/files/${asset.id}/v${n}/${label}.pdf` },
    }));
  }
  for (const v of versions) objects.set(v.storageKey, pdfBytes(`${label} v${v.versionNumber} by ${p.employee?.name ?? 'staff'}`));
  return { asset, versions };
}
/** No staff identity may appear in anything a client receives. */
function assertNoStaffIdentity(body) {
  const text = JSON.stringify(body);
  for (const who of [p.employee, p.manager, p.owner]) {
    assert.ok(!text.includes(who.id), 'staff id leaked');
    assert.ok(!text.includes(who.email), 'staff e-mail leaked');
    assert.ok(!text.includes(who.name), 'staff name leaked');
  }
  assert.doesNotMatch(text, /requestedByUserId|decidedByUserId|createdByUserId|assignedToUserId|storageKey/);
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
  prisma = app.get(PrismaService);
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
  p.other = await member(co.a, 'EMPLOYEE', 'other');
  p.contractor = await member(co.a, 'CONTRACTOR', 'contractor');
  p.clientX = await member(co.a, 'CLIENT', 'clientx', { clientScopeKey: `x-${RUN}`, visibilityScope: 'CLIENT_LEVEL' });
  p.clientY = await member(co.a, 'CLIENT', 'clienty', { clientScopeKey: `y-${RUN}`, visibilityScope: 'CLIENT_LEVEL' });
  p.ownerB = await member(co.b, 'OWNER', 'ownerb');
  p.clientB = await member(co.b, 'CLIENT', 'clientb', { clientScopeKey: `x-${RUN}`, visibilityScope: 'CLIENT_LEVEL' });

  const custX = await prisma.customer.create({ data: { tenantId: co.a.id, name: `Customer X ${RUN}`, clientScopeKey: `x-${RUN}` } });
  const projX = await prisma.project.create({ data: { tenantId: co.a.id, name: `Project X ${RUN}`, status: 'ACTIVE', customerId: custX.id, clientScopeKey: `x-${RUN}`, clientVisible: true } });
  const projInternal = await prisma.project.create({ data: { tenantId: co.a.id, name: `Internal ${RUN}`, status: 'ACTIVE' } });
  const taskX = await prisma.task.create({ data: { tenantId: co.a.id, projectId: projX.id, title: `Video ${RUN}`, assignedToUserId: p.employee.id } });
  const taskInt = await prisma.task.create({ data: { tenantId: co.a.id, projectId: projInternal.id, title: `Internal ${RUN}`, assignedToUserId: p.employee.id } });
  rec.x = await fileWithVersions(co.a, 'video', { taskId: taskX.id }, 2);
  rec.internal = await fileWithVersions(co.a, 'internal', { taskId: taskInt.id }, 1);
  rec.b = await fileWithVersions(co.b, 'bfile', {}, 1);

  for (const k of ['owner', 'manager', 'employee', 'other', 'contractor', 'clientX', 'clientY']) p[k + 'Token'] = await login(p[k], co.a);
  p.ownerBToken = await login(p.ownerB, co.b);
  p.clientBToken = await login(p.clientB, co.b);
});
after(async () => { if (app) await app.close(); });

describe('Delivery: who may send work to the client', { skip }, () => {
  it('only the assigned employee or an OWNER/MANAGER, only for a shared customer project', async () => {
    const [v1] = rec.x.versions;
    assert.equal((await submit(p.otherToken, rec.x.asset, v1)).status, 403, 'not assigned');
    assert.equal((await submit(p.contractorToken, rec.x.asset, v1)).status, 403, 'contractor');
    assert.equal((await submit(p.clientXToken, rec.x.asset, v1)).status, 403, 'client');
    assert.equal((await submit(p.ownerBToken, rec.x.asset, v1)).status, 404, 'other company');
    assert.equal((await submit(p.employeeToken, rec.internal.asset, rec.internal.versions[0])).status, 409, 'project not shared with a client');
    assert.equal((await submit(p.employeeToken, rec.x.asset, rec.internal.versions[0])).status, 404, 'version of another file');
    const office = await fileWithVersions(co.a, 'deck', { taskId: rec.x.asset.taskId }, 1);
    await prisma.fileVersion.update({ where: { id: office.versions[0].id }, data: { originalName: 'deck-v1.pptx' } });
    const refused = await submit(p.employeeToken, office.asset, office.versions[0]);
    assert.equal(refused.status, 422, 'an Office file is not sent to a client');
    assert.match(JSON.stringify(refused.body), /FILE_NOT_CLEARED_FOR_CLIENT/);
  });

  it('the assigned employee sends version 1 and only that client is notified', async () => {
    const res = await submit(p.employeeToken, rec.x.asset, rec.x.versions[0]);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    rec.round1 = res.body.id;
    const asset = await prisma.fileAsset.findUnique({ where: { id: rec.x.asset.id } });
    assert.equal(asset.clientVisible, true);
    assert.equal(asset.clientScopeKey, `x-${RUN}`, 'scope from the project, not the request');
    const notes = await prisma.notification.findMany({ where: { tenantId: co.a.id, resourceId: rec.round1 } });
    assert.deepEqual(notes.map((n) => n.recipientUserId), [p.clientX.id]);
    assertNoStaffIdentity(notes);
    assert.equal((await submit(p.employeeToken, rec.x.asset, rec.x.versions[1])).status, 409, 'already in review');
  });
});

describe('Delivery: the client sees only its own work, under the company name', { skip }, () => {
  it('client X lists and opens it; nothing identifies the employee', async () => {
    const list = await call(p.clientXToken, 'get', '/api/client/deliveries');
    assert.equal(list.status, 200);
    assert.deepEqual(list.body.map((d) => d.id), [rec.round1]);
    assertNoStaffIdentity(list.body);
    const detail = await call(p.clientXToken, 'get', `/api/client/deliveries/${rec.round1}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.company, `Agency A ${RUN}`);
    assert.equal(detail.body.canDecide, true);
    assert.deepEqual(detail.body.thread.map((t) => [t.from, t.kind]), [['company', 'DELIVERED']]);
    assertNoStaffIdentity(detail.body);
  });

  it('client X may open the delivered version, not the undelivered one', async () => {
    const got = await content(p.clientXToken, rec.x.asset, rec.x.versions[0]).buffer(true).parse((res, cb) => { const c = []; res.on('data', (d) => c.push(d)); res.on('end', () => cb(null, Buffer.concat(c))); });
    assert.equal(got.status, 200, 'delivered version');
    assert.equal(got.headers['content-disposition'], `attachment; filename="video ${RUN} v1.pdf"`, 'neutral client file name');
    assert.ok(!got.body.toString('latin1').includes(p.employee.name), 'author removed from the client copy');
    assert.equal(got.body.length, objects.get(rec.x.versions[0].storageKey).length, 'same length, offsets intact');
    assert.ok(objects.get(rec.x.versions[0].storageKey).toString('latin1').includes(p.employee.name), 'the stored original is unchanged');
    assert.equal((await content(p.clientXToken, rec.x.asset, rec.x.versions[1])).status, 403, 'version 2 not delivered');
  });

  it('client Y and another company never see it', async () => {
    assert.deepEqual((await call(p.clientYToken, 'get', '/api/client/deliveries')).body, []);
    assert.equal((await call(p.clientYToken, 'get', `/api/client/deliveries/${rec.round1}`)).status, 404);
    assert.equal((await call(p.clientYToken, 'post', `/api/client/deliveries/${rec.round1}/decision`, { decision: 'APPROVE' })).status, 404);
    assert.equal((await content(p.clientYToken, rec.x.asset, rec.x.versions[0])).status, 403);
    assert.deepEqual((await call(p.clientBToken, 'get', '/api/client/deliveries')).body, [], 'same key, other company');
    assert.equal((await call(p.clientBToken, 'get', `/api/client/deliveries/${rec.round1}`)).status, 404);
    assert.equal((await call(p.ownerBToken, 'get', `/api/deliveries/file/${rec.x.asset.id}`)).status, 404);
  });

  it('staff cannot answer for the client; only withdraw', async () => {
    const asOwner = await call(p.ownerToken, 'post', `/api/approvals/${rec.round1}/decision`, { decision: 'APPROVE' });
    assert.equal(asOwner.status, 403);
    assert.match(JSON.stringify(asOwner.body), /client_decides_deliveries/);
    assert.equal((await call(p.employeeToken, 'post', `/api/client/deliveries/${rec.round1}/decision`, { decision: 'APPROVE' })).status, 403);
  });
});

describe('Delivery: change request, revision, approval', { skip }, () => {
  it('a change request needs a comment and goes straight to the assigned employee', async () => {
    assert.equal((await call(p.clientXToken, 'post', `/api/client/deliveries/${rec.round1}/decision`, { decision: 'REQUEST_CHANGES' })).status, 400);
    const res = await call(p.clientXToken, 'post', `/api/client/deliveries/${rec.round1}/decision`, { decision: 'REQUEST_CHANGES', note: 'Please make the logo bigger.' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal((await call(p.clientXToken, 'post', `/api/client/deliveries/${rec.round1}/decision`, { decision: 'APPROVE' })).status, 409, 'answered once');
    const notes = await prisma.notification.findMany({ where: { tenantId: co.a.id, title: 'Client requested changes', resourceId: rec.x.asset.id } });
    assert.deepEqual(notes.map((n) => n.recipientUserId), [p.employee.id], 'no manager step');
  });

  it('the employee resubmits a new version with a reply; the client sees it as the company', async () => {
    assert.equal((await submit(p.employeeToken, rec.x.asset, rec.x.versions[0], 'again')).status, 409, 'a new version is required');
    const res = await submit(p.employeeToken, rec.x.asset, rec.x.versions[1], 'Logo enlarged, see version 2.');
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.resubmission, true);
    rec.round2 = res.body.id;
    assert.equal((await prisma.approvalRequest.findUnique({ where: { id: rec.round1 } })).status, 'CANCELED');

    const detail = await call(p.clientXToken, 'get', `/api/client/deliveries/${rec.round2}`);
    assert.equal(detail.status, 200);
    assert.deepEqual(detail.body.thread.map((t) => [t.from, t.kind]), [
      ['company', 'DELIVERED'], ['client', 'REQUEST_CHANGES'], ['company', 'REVISION_SENT'], ['company', 'DELIVERED'],
    ]);
    assert.equal(detail.body.thread[2].note, 'Logo enlarged, see version 2.');
    assertNoStaffIdentity(detail.body);
    assert.equal((await call(p.clientXToken, 'get', `/api/client/deliveries/${rec.round1}`)).status, 404, 'closed round is not a delivery any more');
  });

  it('the client approves; the file joins its approved files; the employee is told', async () => {
    const res = await call(p.clientXToken, 'post', `/api/client/deliveries/${rec.round2}/decision`, { decision: 'APPROVE', note: 'Great, thanks.' });
    assert.equal(res.status, 200);
    const files = await call(p.clientXToken, 'get', '/api/client/files');
    const file = files.body.find((f) => f.id === rec.x.asset.id);
    assert.deepEqual(file?.versions.map((v) => v.versionNumber), [2]);
    assertNoStaffIdentity(files.body);
    assert.equal((await prisma.notification.count({ where: { tenantId: co.a.id, recipientUserId: p.employee.id, title: 'Client approved the delivery' } })), 1);
  });
});

describe('Delivery: managers and owners follow it; it is audited', { skip }, () => {
  it('managers and owners see every round; clients cannot use the staff routes', async () => {
    for (const who of ['managerToken', 'ownerToken']) {
      const rounds = await call(p[who], 'get', `/api/deliveries/file/${rec.x.asset.id}`);
      assert.equal(rounds.status, 200);
      assert.deepEqual(rounds.body.map((r) => r.status), ['APPROVED', 'CANCELED']);
      const queue = await call(p[who], 'get', '/api/approvals');
      assert.ok(queue.body.some((a) => a.id === rec.round2 && a.clientVisible === true));
    }
    assert.equal((await call(p.clientXToken, 'get', `/api/deliveries/file/${rec.x.asset.id}`)).status, 403);
  });

  it('each step is in the audit log', async () => {
    const actions = (await prisma.auditEvent.findMany({ where: { tenantId: co.a.id, resourceType: 'ApprovalRequest' } })).map((e) => e.action);
    for (const a of ['delivery.submitted', 'delivery.changes_requested', 'delivery.resubmitted', 'delivery.approved']) assert.ok(actions.includes(a), a);
  });
});
