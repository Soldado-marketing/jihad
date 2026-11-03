/**
 * Client Portal V2 (owner decision 2026-11-02): shooting appointments that
 * staff schedule and the client confirms, video and link deliveries, invoices
 * with several partial payments, and notices that open the right record. A
 * client sees only its own records and never a staff identity.
 * Real Nest HTTP + isolated test database; no e-mail is sent.
 * Run with MAOS_INTEGRATION=1, DATABASE_URL and JWT_SECRET, after migrations.
 * Requires a TEST database only; never point this suite at production.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { before, after, describe, it } from 'node:test';

// Storage is unroutable on purpose; the suite serves its own objects below.
process.env.S3_BUCKET ||= 'portal-v2-test-bucket';
process.env.S3_REGION ||= 'eu-central-1';
process.env.S3_ACCESS_KEY_ID ||= 'portal';
process.env.S3_SECRET_ACCESS_KEY ||= 'portal';
process.env.S3_ENDPOINT = 'http://127.0.0.1:9';
process.env.S3_KEY_PREFIX = '';
process.env.S3_FORCE_PATH_STYLE = 'true';

const require = createRequire(import.meta.url);
const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const skip = process.env.MAOS_INTEGRATION !== '1' || !existsSync(join(apiRoot, 'dist/app.module.js'));
const RUN = 'v2' + Date.now().toString(36);
const PASSWORD = 'ClientPortalV2Test123!';
const HOUR = 60 * 60 * 1000;

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
let ip = 0;
async function login(person, tenant) {
  const res = await request(server).post('/api/auth/login').set('X-Forwarded-For', `198.51.100.${++ip}`).send({ email: person.email, passwordOrMagicCode: PASSWORD, tenantSlug: tenant.slug });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.tokens.accessToken;
}
const call = (token, method, path, body, headers = {}) => {
  let req = request(server)[method](path).set('Authorization', `Bearer ${token}`);
  for (const [k, v] of Object.entries(headers)) req = req.set(k, v);
  return body ? req.send(body) : req;
};
const notesFor = (resourceId) => prisma.notification.findMany({ where: { tenantId: co.a.id, resourceId }, orderBy: { createdAt: 'asc' } });

/** No staff identity may appear in anything a client receives. */
function assertNoStaffIdentity(body) {
  const text = JSON.stringify(body);
  for (const who of [p.employee, p.manager, p.owner]) {
    assert.ok(!text.includes(who.id), 'staff id leaked');
    assert.ok(!text.includes(who.email), 'staff e-mail leaked');
    assert.ok(!text.includes(who.name), 'staff name leaked');
  }
  assert.doesNotMatch(text, /assignedToUserId|createdByUserId|actorUserId|actorId|storageKey/);
}

// Stored objects for the suite: a video with an author box, links good and bad.
const objects = new Map();
const box = (type, ...parts) => { const body = Buffer.concat(parts); const h = Buffer.alloc(8); h.writeUInt32BE(body.length + 8, 0); h.write(type, 4, 'latin1'); return Buffer.concat([h, body]); };
const video = () => Buffer.concat([
  box('ftyp', Buffer.from('isom\0\0\x02\0isomiso2', 'latin1')),
  box('moov', box('mvhd', Buffer.alloc(20)), box('udta', box('\xa9ART', Buffer.from(p.employee.name, 'latin1')))),
  box('mdat', Buffer.from('frames', 'latin1')),
]);
const shortcut = (url) => Buffer.from(`[InternetShortcut]\r\nURL=${url}\r\nIconFile=C:\\Users\\${p.employee.name}\\icon.ico\r\n`, 'utf8');
async function deliverable(label, ext, body) {
  const asset = await prisma.fileAsset.create({ data: { tenantId: co.a.id, name: `${label} ${RUN}`, mimeType: 'application/octet-stream', versionCount: 1, taskId: rec.taskX.id } });
  const version = await prisma.fileVersion.create({
    data: { tenantId: co.a.id, fileAssetId: asset.id, versionNumber: 1, originalName: `${p.employee.name}-${label}${ext}`, sizeBytes: body.length, storageKey: `tenants/${co.a.id}/files/${asset.id}/v1/${label}${ext}` },
  });
  objects.set(version.storageKey, body);
  return { asset, version };
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
    return { stream: Readable.from([body]), contentLength: body.length, contentType: 'application/octet-stream' };
  };

  co.a = await prisma.tenant.create({ data: { name: `Agency A ${RUN}`, slug: `${RUN}-a`, status: 'ACTIVE' } });
  co.b = await prisma.tenant.create({ data: { name: `Agency B ${RUN}`, slug: `${RUN}-b`, status: 'ACTIVE' } });
  p.owner = await member(co.a, 'OWNER', 'owner');
  p.manager = await member(co.a, 'MANAGER', 'manager');
  p.employee = await member(co.a, 'EMPLOYEE', 'employee');
  p.contractor = await member(co.a, 'CONTRACTOR', 'contractor');
  p.clientX = await member(co.a, 'CLIENT', 'clientx', { clientScopeKey: `x-${RUN}`, visibilityScope: 'CLIENT_LEVEL' });
  p.clientY = await member(co.a, 'CLIENT', 'clienty', { clientScopeKey: `y-${RUN}`, visibilityScope: 'CLIENT_LEVEL' });
  p.ownerB = await member(co.b, 'OWNER', 'ownerb');
  p.clientB = await member(co.b, 'CLIENT', 'clientb', { clientScopeKey: `x-${RUN}`, visibilityScope: 'CLIENT_LEVEL' });

  const custX = await prisma.customer.create({ data: { tenantId: co.a.id, name: `Customer X ${RUN}`, clientScopeKey: `x-${RUN}` } });
  rec.projX = await prisma.project.create({ data: { tenantId: co.a.id, name: `Project X ${RUN}`, status: 'ACTIVE', customerId: custX.id, clientScopeKey: `x-${RUN}`, clientVisible: true } });
  rec.projInternal = await prisma.project.create({ data: { tenantId: co.a.id, name: `Internal ${RUN}`, status: 'ACTIVE' } });
  rec.taskX = await prisma.task.create({ data: { tenantId: co.a.id, projectId: rec.projX.id, title: `Campaign ${RUN}`, assignedToUserId: p.employee.id } });

  for (const k of ['owner', 'manager', 'employee', 'contractor', 'clientX', 'clientY']) p[k + 'Token'] = await login(p[k], co.a);
  p.ownerBToken = await login(p.ownerB, co.b);
  p.clientBToken = await login(p.clientB, co.b);
});
after(async () => { if (app) await app.close(); });

const plan = (overrides = {}) => ({ projectId: rec.projX.id, startsAt: new Date(Date.now() + 72 * HOUR).toISOString(), location: 'Studio 3, Example Street 1, Berlin', preparation: 'Bring two outfits.', ...overrides });

describe('Appointments: only staff schedule them, only for a shared project', { skip }, () => {
  it('refuses clients, contractors, another company, internal projects and bad input', async () => {
    assert.equal((await call(p.clientXToken, 'post', '/api/appointments', plan())).status, 403, 'client');
    assert.equal((await call(p.contractorToken, 'post', '/api/appointments', plan())).status, 403, 'contractor');
    assert.equal((await call(p.ownerBToken, 'post', '/api/appointments', plan())).status, 404, 'other company');
    const internal = await call(p.employeeToken, 'post', '/api/appointments', plan({ projectId: rec.projInternal.id }));
    assert.equal(internal.status, 409);
    assert.match(JSON.stringify(internal.body), /PROJECT_NOT_SHARED/);
    assert.equal((await call(p.employeeToken, 'post', '/api/appointments', plan({ location: '' }))).status, 400, 'location is required');
    assert.equal((await call(p.employeeToken, 'post', '/api/appointments', plan({ startsAt: 'tomorrow' }))).status, 400, 'a real date');
  });

  it('an employee schedules one; only that client is told, without who is filming', async () => {
    const res = await call(p.employeeToken, 'post', '/api/appointments', plan({ title: 'Spring shoot' }));
    assert.equal(res.status, 201, JSON.stringify(res.body));
    rec.appt = res.body.id;
    assert.equal(res.body.status, 'SCHEDULED');
    const task = await prisma.task.findUnique({ where: { id: rec.appt } });
    assert.equal(task.clientScopeKey, `x-${RUN}`, 'scope from the project, never the request');
    assert.equal(task.clientVisible, true);
    const notes = await notesFor(rec.appt);
    assert.deepEqual(notes.map((n) => n.recipientUserId), [p.clientX.id]);
    assert.equal(notes[0].resourceType, 'appointment');
    assertNoStaffIdentity(notes.map(({ title, body }) => ({ title, body })));
  });
});

describe('Appointments: each client sees only its own', { skip }, () => {
  it('client X sees date, place and preparation; Y and the other company see nothing', async () => {
    const x = await call(p.clientXToken, 'get', '/api/client/appointments');
    assert.equal(x.status, 200);
    assert.deepEqual(x.body.map((a) => a.id), [rec.appt]);
    assert.equal(x.body[0].location, 'Studio 3, Example Street 1, Berlin');
    assert.equal(x.body[0].preparation, 'Bring two outfits.');
    assert.equal(x.body[0].seenCurrent, false);
    assertNoStaffIdentity(x.body);
    assert.deepEqual((await call(p.clientYToken, 'get', '/api/client/appointments')).body, []);
    assert.deepEqual((await call(p.clientBToken, 'get', '/api/client/appointments')).body, []);
    assert.equal((await call(p.clientXToken, 'get', '/api/appointments')).status, 403, 'clients cannot use the staff list');
  });
});

describe('Appointments: "I have seen this" and changes', { skip }, () => {
  it('only that client can confirm it', async () => {
    assert.equal((await call(p.clientYToken, 'post', `/api/client/appointments/${rec.appt}/seen`)).status, 404, 'other client');
    assert.equal((await call(p.clientBToken, 'post', `/api/client/appointments/${rec.appt}/seen`)).status, 404, 'other company');
    assert.equal((await call(p.employeeToken, 'post', `/api/client/appointments/${rec.appt}/seen`)).status, 403, 'staff cannot confirm for the client');
    assert.equal((await call(p.clientXToken, 'post', `/api/client/appointments/${rec.appt}/seen`)).status, 200);
    assert.equal((await call(p.clientXToken, 'post', `/api/client/appointments/${rec.appt}/seen`)).status, 200, 'twice is fine');
    const seen = await prisma.auditEvent.count({ where: { tenantId: co.a.id, resourceId: rec.appt, action: 'appointment.seen' } });
    assert.equal(seen, 1, 'recorded once per change');
    const staff = await call(p.managerToken, 'get', `/api/appointments?projectId=${rec.projX.id}`);
    assert.equal(staff.body.find((a) => a.id === rec.appt).seenCurrent, true);
  });

  it('a change tells the client again and asks for a new confirmation', async () => {
    const moved = new Date(Date.now() + 96 * HOUR).toISOString();
    const res = await call(p.managerToken, 'patch', `/api/appointments/${rec.appt}`, { startsAt: moved, location: 'Rooftop, Example Street 9' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.preparation, 'Bring two outfits.', 'unchanged fields stay');
    const notes = await notesFor(rec.appt);
    assert.deepEqual(notes.map((n) => n.title), ['Shooting appointment scheduled', 'Shooting appointment changed']);
    const x = (await call(p.clientXToken, 'get', '/api/client/appointments')).body[0];
    assert.equal(x.location, 'Rooftop, Example Street 9');
    assert.equal(x.seenCurrent, false);
    assert.ok(x.seenAt, 'the earlier confirmation is still shown');
    await call(p.clientXToken, 'post', `/api/client/appointments/${rec.appt}/seen`);
    assert.equal((await call(p.clientXToken, 'get', '/api/client/appointments')).body[0].seenCurrent, true);
    assert.equal((await call(p.clientXToken, 'patch', `/api/appointments/${rec.appt}`, { location: 'Elsewhere' })).status, 403, 'clients cannot edit');
  });

  it('cancelling tells the client once and freezes it', async () => {
    const extra = await call(p.employeeToken, 'post', '/api/appointments', plan({ title: 'Cancelled shoot' }));
    rec.cancelled = extra.body.id;
    assert.equal((await call(p.employeeToken, 'post', `/api/appointments/${rec.cancelled}/cancel`)).body.status, 'CANCELLED');
    assert.equal((await call(p.employeeToken, 'post', `/api/appointments/${rec.cancelled}/cancel`)).status, 200, 'again is harmless');
    assert.deepEqual((await notesFor(rec.cancelled)).map((n) => n.title), ['Shooting appointment scheduled', 'Shooting appointment cancelled']);
    assert.equal((await call(p.employeeToken, 'patch', `/api/appointments/${rec.cancelled}`, { location: 'New place' })).status, 409);
    const x = (await call(p.clientXToken, 'get', '/api/client/appointments')).body.find((a) => a.id === rec.cancelled);
    assert.equal(x.status, 'CANCELLED');
  });

  it('every change is in the audit log', async () => {
    const actions = (await prisma.auditEvent.findMany({ where: { tenantId: co.a.id, resourceType: 'Appointment' } })).map((e) => e.action);
    for (const a of ['appointment.scheduled', 'appointment.updated', 'appointment.cancelled', 'appointment.seen']) assert.ok(actions.includes(a), a);
  });
});

describe('Appointments: a reminder the day before', { skip }, () => {
  it('reminds only that client, once per start time', async () => {
    const soon = await call(p.employeeToken, 'post', '/api/appointments', plan({ title: 'Tomorrow shoot', startsAt: new Date(Date.now() + 20 * HOUR).toISOString() }));
    const { AppointmentRemindersJob } = require(join(apiRoot, 'dist/modules/scheduler/jobs/appointment-reminders.job.js'));
    const job = app.get(AppointmentRemindersJob);
    await job.run(prisma);
    await job.run(prisma);
    const reminders = (await notesFor(soon.body.id)).filter((n) => n.title.startsWith('Reminder'));
    assert.deepEqual(reminders.map((n) => n.recipientUserId), [p.clientX.id]);
    assert.equal((await notesFor(rec.appt)).filter((n) => n.title.startsWith('Reminder')).length, 0, 'four days away: not yet');
  });
});

describe('Deliveries: videos and links', { skip }, () => {
  it('a video reaches the client without its author box, under the same length', async () => {
    const v = await deliverable('reel', '.mp4', video());
    const sent = await call(p.employeeToken, 'post', '/api/deliveries', { fileAssetId: v.asset.id, fileVersionId: v.version.id });
    assert.equal(sent.status, 201, JSON.stringify(sent.body));
    const list = await call(p.clientXToken, 'get', '/api/client/deliveries');
    assert.equal(list.body.find((d) => d.id === sent.body.id).kind, 'video');
    assertNoStaffIdentity(list.body);
    const file = await call(p.clientXToken, 'get', `/api/client/files/${v.asset.id}/versions/${v.version.id}/content`).buffer(true);
    assert.equal(file.status, 200);
    assert.equal(file.body.length, objects.get(v.version.storageKey).length);
    assert.ok(!file.body.toString('latin1').includes(p.employee.name), 'no author in the copy');
    assert.doesNotMatch(String(file.headers['content-disposition']), new RegExp(p.employee.name.split(' ')[0]), 'safe file name');
  });

  it('a Google Drive link reaches the client as the address only; anything else is refused', async () => {
    const l = await deliverable('drive', '.url', shortcut('https://drive.google.com/file/d/example/view'));
    const sent = await call(p.employeeToken, 'post', '/api/deliveries', { fileAssetId: l.asset.id, fileVersionId: l.version.id });
    assert.equal(sent.status, 201, JSON.stringify(sent.body));
    const detail = await call(p.clientXToken, 'get', `/api/client/deliveries/${sent.body.id}`);
    assert.equal(detail.body.file.kind, 'link');
    const file = await call(p.clientXToken, 'get', `/api/client/files/${l.asset.id}/versions/${l.version.id}/content`).buffer(true);
    assert.equal(file.body.toString('utf8'), '[InternetShortcut]\r\nURL=https://drive.google.com/file/d/example/view\r\n');
    for (const bad of ['http://drive.google.com/x', 'javascript:alert(1)']) {
      const b = await deliverable('bad', '.url', shortcut(bad));
      const refused = await call(p.employeeToken, 'post', '/api/deliveries', { fileAssetId: b.asset.id, fileVersionId: b.version.id });
      assert.equal(refused.status, 422, bad);
    }
    assert.equal((await call(p.clientYToken, 'get', `/api/client/deliveries/${sent.body.id}`)).status, 404, 'other client');
  });
});

describe('Invoices: several partial payments against one invoice', { skip }, () => {
  it('only an OWNER records payments; the client sees paid and open amounts', async () => {
    rec.inv = await prisma.invoice.create({
      data: { tenantId: co.a.id, invoiceNumber: `${RUN}-1`, status: 'SENT', currency: 'EUR', clientVisible: true, clientScopeKey: `x-${RUN}`, projectId: rec.projX.id, subtotalCents: 100000, totalCents: 100000, issuedAt: new Date() },
    });
    const pay = (token, amountCents, key) => call(token, 'post', '/api/payments', { invoiceId: rec.inv.id, amountCents, currency: 'EUR', method: 'BANK_TRANSFER', status: 'RECORDED' }, { 'Idempotency-Key': key });
    for (const who of ['managerToken', 'employeeToken', 'clientXToken']) assert.equal((await pay(p[who], 100, `${RUN}-${who}`)).status, 403, who);

    assert.equal((await pay(p.ownerToken, 30000, `${RUN}-p1`)).status, 201);
    assert.equal((await pay(p.ownerToken, 30000, `${RUN}-p1`)).status, 201, 'replayed key');
    let x = await call(p.clientXToken, 'get', `/api/client/invoices/${rec.inv.id}`);
    assert.equal(x.body.paidCents, 30000, 'a replay is not a second payment');
    assert.equal(x.body.status, 'PARTIALLY_PAID');

    assert.equal((await pay(p.ownerToken, 45000, `${RUN}-p2`)).status, 201);
    x = await call(p.clientXToken, 'get', `/api/client/invoices/${rec.inv.id}`);
    assert.equal(x.body.paidCents, 75000);
    assert.equal(x.body.payments.length, 2);

    assert.equal((await pay(p.ownerToken, 25000, `${RUN}-p3`)).status, 201);
    x = await call(p.clientXToken, 'get', `/api/client/invoices/${rec.inv.id}`);
    assert.equal(x.body.status, 'PAID');
    assert.equal(x.body.totalCents - x.body.paidCents, 0);
    assertNoStaffIdentity(x.body);
    assert.equal((await call(p.clientYToken, 'get', `/api/client/invoices/${rec.inv.id}`)).status, 404, 'other client');
  });

  it('the client is told about each payment, without amounts, and only that client', async () => {
    const notes = await notesFor(rec.inv.id); // staff notices point at the payment, not the invoice
    assert.deepEqual(notes.map((n) => n.title), ['Payment received', 'Payment received', 'Invoice paid in full']);
    assert.ok(notes.every((n) => n.recipientUserId === p.clientX.id && n.resourceType === 'invoice'));
    assert.ok(notes.every((n) => !/\d{3}|€|EUR/.test(`${n.title} ${n.body}`.replace(rec.inv.invoiceNumber, ''))), 'no amount');
  });

  it('a payment on an invoice the client cannot see sends no notice', async () => {
    const hidden = await prisma.invoice.create({
      data: { tenantId: co.a.id, invoiceNumber: `${RUN}-2`, status: 'SENT', currency: 'EUR', clientVisible: false, clientScopeKey: `x-${RUN}`, subtotalCents: 1000, totalCents: 1000, issuedAt: new Date() },
    });
    await call(p.ownerToken, 'post', '/api/payments', { invoiceId: hidden.id, amountCents: 500, currency: 'EUR', status: 'RECORDED' }, { 'Idempotency-Key': `${RUN}-hidden` });
    assert.equal((await notesFor(hidden.id)).length, 0);
  });
});

describe('Notifications: the client reads and clears its own', { skip }, () => {
  it('lists only its own notices, each with a record to open, and marks all as read', async () => {
    const list = await call(p.clientXToken, 'get', '/api/notifications');
    assert.equal(list.status, 200);
    assert.ok(list.body.length >= 5);
    assert.ok(list.body.every((n) => ['appointment', 'delivery', 'invoice'].includes(n.resourceType) && n.resourceId), 'every notice opens something');
    assertNoStaffIdentity(list.body);
    assert.deepEqual((await call(p.clientYToken, 'get', '/api/notifications')).body, [], 'nothing for another client');
    assert.ok(Number((await call(p.clientXToken, 'get', '/api/notifications/unread-count')).text) > 0);
    assert.equal((await call(p.clientXToken, 'patch', '/api/notifications/read-all')).status, 200);
    assert.equal(Number((await call(p.clientXToken, 'get', '/api/notifications/unread-count')).text), 0);
  });
});
