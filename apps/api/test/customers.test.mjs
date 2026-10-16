/**
 * Customer entity (ADR-017: MAOS-T50 schema, T51 backfill, T52 API).
 * MIGRATION-GATED: runs only against a database migrated with this branch.
 *
 * The Customer is the business entity behind a clientScopeKey; the key stays
 * the authorization boundary and never changes after creation. customerId on
 * Project, Invoice and FileAsset is derived from the row's own key, so a row
 * can never point at another client's (or tenant's) Customer.
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
const built = existsSync(join(apiRoot, 'dist/modules/customers/customers.module.js'));
const configured = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET);
const skip = !enabled
  ? 'set MAOS_INTEGRATION=1 to run'
  : !built
    ? 'run `npm run build` first'
    : !configured
      ? 'DATABASE_URL and JWT_SECRET must be set'
      : false;

const RUN = `cu${Date.now().toString(36)}`;
const PASSWORD = 'CustomerPass123!';

let app;
let server;
let request;
let prisma;
let backfillCustomers;
const t = {};
const people = {};

const as = (who) => ({
  get: (url) => request(server).get(`/api${url}`).set('Authorization', `Bearer ${people[who].token}`),
  post: (url, body) => request(server).post(`/api${url}`).set('Authorization', `Bearer ${people[who].token}`).send(body),
  patch: (url, body) => request(server).patch(`/api${url}`).set('Authorization', `Bearer ${people[who].token}`).send(body),
});

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
  ({ backfillCustomers } = require(join(apiRoot, 'dist/modules/customers/customer-backfill.js')));

  const hash = await require('bcrypt').hash(PASSWORD, 10);
  for (const name of ['a', 'b']) {
    t[name] = await prisma.tenant.create({ data: { name: `T${name} ${RUN}`, slug: `t${name}-${RUN}`, status: 'ACTIVE' }, select: { id: true } });
  }
  async function member(tenant, label, role, clientScopeKey) {
    const email = `${label}-${RUN}@example.test`;
    const user = await prisma.user.create({ data: { email, displayName: label, passwordHash: hash, status: 'APPROVED' }, select: { id: true } });
    await prisma.tenantMembership.create({
      data: { tenantId: t[tenant].id, userId: user.id, role, status: 'ACTIVE', visibilityScope: 'TENANT_WIDE', clientScopeKey },
    });
    const res = await request(server).post('/api/auth/login').send({ email, passwordOrMagicCode: PASSWORD, tenantSlug: `t${tenant}-${RUN}` });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return { id: user.id, token: res.body.tokens.accessToken };
  }
  people.owner = await member('a', 'owner', 'OWNER');
  people.manager = await member('a', 'manager', 'MANAGER');
  people.employee = await member('a', 'employee', 'EMPLOYEE');
  people.contractor = await member('a', 'contractor', 'CONTRACTOR');
  people.client = await member('a', 'client', 'CLIENT', `acme-${RUN}`);
  people.foreign = await member('b', 'foreign', 'OWNER');
});

after(async () => {
  if (app) await app.close();
});

describe('customer backfill (MAOS-T51)', { skip }, () => {
  it('dry run counts per tenant and writes nothing; the real run creates one Customer per key and links rows; a re-run does nothing', async () => {
    // Keys spread over several tables, the same key in two tenants, and a null key.
    const ka = `bf-alpha-${RUN}`;
    const kb = `bf-beta-${RUN}`;
    const p1 = await prisma.project.create({ data: { tenantId: t.a.id, name: 'P1', clientScopeKey: ka }, select: { id: true } });
    const p2 = await prisma.project.create({ data: { tenantId: t.a.id, name: 'P2' }, select: { id: true } });
    const inv = await prisma.invoice.create({ data: { tenantId: t.a.id, invoiceNumber: `BF-${RUN}`, currency: 'EUR', clientScopeKey: kb }, select: { id: true } });
    const f1 = await prisma.fileAsset.create({ data: { tenantId: t.a.id, name: 'f1', clientScopeKey: ka }, select: { id: true } });
    await prisma.task.create({ data: { tenantId: t.a.id, title: 'only on a task', clientScopeKey: `bf-gamma-${RUN}` } });
    const pb = await prisma.project.create({ data: { tenantId: t.b.id, name: 'PB', clientScopeKey: ka }, select: { id: true } });

    const dry = await backfillCustomers(prisma, { dryRun: true, tenantIds: [t.a.id, t.b.id] });
    assert.equal(dry.dryRun, true);
    const ra = dry.tenants.find((x) => x.tenantId === t.a.id);
    const rb = dry.tenants.find((x) => x.tenantId === t.b.id);
    // Tenant a: alpha, beta, gamma and the client membership key.
    assert.deepEqual([ra.distinctKeys, ra.customersToCreate], [4, 4]);
    assert.deepEqual(ra.rowsToLink, { Project: 1, Invoice: 1, FileAsset: 1 });
    assert.deepEqual([rb.distinctKeys, rb.customersToCreate, rb.rowsToLink.Project], [1, 1, 1]);
    assert.ok(!JSON.stringify(dry).includes(ka), 'the report carries counts, never keys');
    assert.equal(await prisma.customer.count({ where: { tenantId: { in: [t.a.id, t.b.id] } } }), 0, 'dry run wrote nothing');
    // tenantIds limits the run to those tenants (tests); the default - what the
    // command line uses in production - still covers every tenant.
    assert.deepEqual(dry.tenants.map((x) => x.tenantId).sort(), [t.a.id, t.b.id].sort());
    const global = await backfillCustomers(prisma, { dryRun: true });
    assert.ok([t.a.id, t.b.id].every((id) => global.tenants.some((x) => x.tenantId === id)));

    const real = await backfillCustomers(prisma, { dryRun: false, tenantIds: [t.a.id, t.b.id] });
    assert.ok(real.customersCreated >= 5);
    const ca = await prisma.customer.findUnique({ where: { tenantId_clientScopeKey: { tenantId: t.a.id, clientScopeKey: ka } } });
    const cb = await prisma.customer.findUnique({ where: { tenantId_clientScopeKey: { tenantId: t.b.id, clientScopeKey: ka } } });
    assert.equal(ca.name, ka, 'named after its key until renamed');
    assert.notEqual(ca.id, cb.id, 'same key in two tenants: two customers');
    assert.equal((await prisma.project.findUnique({ where: { id: p1.id } })).customerId, ca.id);
    assert.equal((await prisma.project.findUnique({ where: { id: p2.id } })).customerId, null);
    assert.equal((await prisma.project.findUnique({ where: { id: pb.id } })).customerId, cb.id);
    assert.equal((await prisma.fileAsset.findUnique({ where: { id: f1.id } })).customerId, ca.id);
    assert.ok((await prisma.invoice.findUnique({ where: { id: inv.id } })).customerId);

    // Idempotency is checked on this suite's own tenants. The fill-in is global
    // and other suites run in parallel, creating client-keyed rows in their
    // own tenants, so the global counts of a second run need not be 0 (this
    // assertion was flaky in CI-style runs).
    const mine = { tenantId: { in: [t.a.id, t.b.id] } };
    const snapshot = async () => JSON.stringify([
      await prisma.customer.findMany({ where: mine, orderBy: { id: 'asc' }, select: { id: true, clientScopeKey: true } }),
      await prisma.project.findMany({ where: mine, orderBy: { id: 'asc' }, select: { id: true, customerId: true } }),
      await prisma.invoice.findMany({ where: mine, orderBy: { id: 'asc' }, select: { id: true, customerId: true } }),
      await prisma.fileAsset.findMany({ where: mine, orderBy: { id: 'asc' }, select: { id: true, customerId: true } }),
    ]);
    const before = await snapshot();
    const again = await backfillCustomers(prisma, { dryRun: false, tenantIds: [t.a.id, t.b.id] });
    assert.equal(again.dryRun, false);
    assert.equal(await snapshot(), before, 'a re-run creates and relinks nothing in these tenants');
  });

  it('repairs a customerId that does not match the row key', async () => {
    const k1 = `rp-one-${RUN}`;
    const k2 = `rp-two-${RUN}`;
    const c1 = await prisma.customer.create({ data: { tenantId: t.a.id, clientScopeKey: k1, name: 'one' } });
    await prisma.customer.create({ data: { tenantId: t.a.id, clientScopeKey: k2, name: 'two' } });
    // A row whose key changed outside the API after it was linked.
    const p = await prisma.project.create({ data: { tenantId: t.a.id, name: 'drifted', clientScopeKey: k2, customerId: c1.id } });
    const q = await prisma.project.create({ data: { tenantId: t.a.id, name: 'unkeyed', clientScopeKey: null, customerId: c1.id } });
    await backfillCustomers(prisma, { dryRun: false, tenantIds: [t.a.id, t.b.id] });
    const c2 = await prisma.customer.findUnique({ where: { tenantId_clientScopeKey: { tenantId: t.a.id, clientScopeKey: k2 } } });
    assert.equal((await prisma.project.findUnique({ where: { id: p.id } })).customerId, c2.id);
    assert.equal((await prisma.project.findUnique({ where: { id: q.id } })).customerId, null);
  });
});

describe('customer API (MAOS-T52)', { skip }, () => {
  let acme;

  it('OWNER creates a customer; rows already carrying the key are linked to it', async () => {
    // Not the client membership key: the backfill above already made that one a Customer.
    const key = `shop-${RUN}`;
    const existing = await prisma.project.create({ data: { tenantId: t.a.id, name: 'Acme site', clientScopeKey: key }, select: { id: true } });
    const res = await as('owner').post('/customers', { name: 'Acme GmbH', clientScopeKey: key, industry: 'Retail', website: 'https://acme.example' });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    acme = res.body;
    assert.equal(acme.clientScopeKey, key);
    assert.equal(acme._count.projects, 1);
    assert.equal((await prisma.project.findUnique({ where: { id: existing.id } })).customerId, acme.id);
    assert.equal(await prisma.auditEvent.count({ where: { tenantId: t.a.id, resourceId: acme.id, action: 'customer.created' } }), 1);
  });

  it('refuses a duplicate key, a malformed key and a responsible person from outside the team', async () => {
    const dup = await as('manager').post('/customers', { name: 'Again', clientScopeKey: acme.clientScopeKey });
    assert.equal(dup.status, 409);
    assert.match(JSON.stringify(dup.body), /CUSTOMER_KEY_EXISTS/);
    for (const clientScopeKey of ['', 'has space', '-leading', 'x'.repeat(121)]) {
      assert.equal((await as('owner').post('/customers', { name: 'Bad', clientScopeKey })).status, 400, clientScopeKey);
    }
    for (const responsibleUserId of [people.client.id, people.foreign.id, 'nope']) {
      const res = await as('owner').post('/customers', { name: 'R', clientScopeKey: `r-${RUN}-${responsibleUserId.length}`, responsibleUserId });
      assert.equal(res.status, 400, responsibleUserId);
    }
    const ok = await as('owner').post('/customers', { name: 'Resp', clientScopeKey: `resp-${RUN}`, responsibleUserId: people.employee.id });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.responsibleUser.id, people.employee.id);
  });

  it('the key can never be changed', async () => {
    const res = await as('owner').patch(`/customers/${acme.id}`, { clientScopeKey: 'other' });
    assert.equal(res.status, 400);
    assert.equal((await prisma.customer.findUnique({ where: { id: acme.id } })).clientScopeKey, acme.clientScopeKey);
  });

  it('role defaults: MANAGER writes but cannot archive; EMPLOYEE reads; CONTRACTOR and CLIENT get nothing', async () => {
    assert.equal((await as('manager').patch(`/customers/${acme.id}`, { name: 'Acme AG', status: 'INACTIVE' })).status, 200);
    const archive = await as('manager').patch(`/customers/${acme.id}`, { status: 'ARCHIVED' });
    assert.equal(archive.status, 403);
    assert.match(JSON.stringify(archive.body), /CUSTOMER_ARCHIVE_OWNER_ONLY/);
    assert.equal((await as('owner').patch(`/customers/${acme.id}`, { status: 'ARCHIVED' })).status, 200);
    assert.equal((await as('manager').patch(`/customers/${acme.id}`, { status: 'ACTIVE' })).status, 403, 'restoring is owner-only too');

    assert.equal((await as('employee').get('/customers')).status, 200);
    assert.equal((await as('employee').get(`/customers/${acme.id}`)).status, 200);
    assert.equal((await as('employee').post('/customers', { name: 'E', clientScopeKey: `e-${RUN}` })).status, 403);
    assert.equal((await as('employee').patch(`/customers/${acme.id}`, { name: 'E' })).status, 403);
    for (const who of ['contractor', 'client']) {
      assert.equal((await as(who).get('/customers')).status, 403, who);
      assert.equal((await as(who).get(`/customers/${acme.id}`)).status, 403, who);
    }
    assert.equal((await request(server).get('/api/customers')).status, 401);
  });

  it('another tenant can neither see nor change a customer', async () => {
    const list = await as('foreign').get('/customers');
    assert.equal(list.status, 200);
    assert.ok(!list.body.some((c) => c.id === acme.id));
    assert.equal((await as('foreign').get(`/customers/${acme.id}`)).status, 404);
    assert.equal((await as('foreign').patch(`/customers/${acme.id}`, { name: 'hijack' })).status, 404);
    // Same key in tenant b creates b's own customer; a's stays untouched.
    const own = await as('foreign').post('/customers', { name: 'B Acme', clientScopeKey: acme.clientScopeKey });
    assert.equal(own.status, 201);
    assert.notEqual(own.body.id, acme.id);
    assert.equal((await prisma.customer.findUnique({ where: { id: acme.id } })).name, 'Acme AG');
  });

  it('new invoices and files take the Customer of their own key; a key change moves the file', async () => {
    const other = await as('owner').post('/customers', { name: 'Other', clientScopeKey: `other-${RUN}` });
    const inv = await as('owner').post('/invoices', {
      invoiceNumber: `CU-${RUN}`,
      currency: 'EUR',
      clientScopeKey: acme.clientScopeKey,
      lines: [{ description: 'Work', quantity: 1, unitAmountCents: 1000 }],
    });
    assert.equal(inv.status, 201, JSON.stringify(inv.body));
    assert.equal((await prisma.invoice.findUnique({ where: { id: inv.body.id } })).customerId, acme.id);
    // A request cannot choose the customer.
    const forged = await as('owner').post('/invoices', { invoiceNumber: `CU2-${RUN}`, currency: 'EUR', customerId: other.body.id });
    assert.equal(forged.status, 400);

    const file = await as('owner').post('/files', { name: 'brief.pdf', clientScopeKey: acme.clientScopeKey });
    assert.equal(file.status, 201, JSON.stringify(file.body));
    assert.equal((await prisma.fileAsset.findUnique({ where: { id: file.body.id } })).customerId, acme.id);
    assert.equal((await as('owner').patch(`/files/${file.body.id}`, { clientScopeKey: other.body.clientScopeKey })).status, 200);
    assert.equal((await prisma.fileAsset.findUnique({ where: { id: file.body.id } })).customerId, other.body.id);
    assert.equal((await as('owner').patch(`/files/${file.body.id}`, { clientScopeKey: `nobody-${RUN}` })).status, 200);
    assert.equal((await prisma.fileAsset.findUnique({ where: { id: file.body.id } })).customerId, null);
    const unkeyed = await as('owner').post('/files', { name: 'internal.txt' });
    assert.equal((await prisma.fileAsset.findUnique({ where: { id: unkeyed.body.id } })).customerId, null);
  });

  it('a customer with linked records cannot be deleted at the database level', async () => {
    await assert.rejects(prisma.customer.delete({ where: { id: acme.id } }));
    assert.ok(await prisma.customer.findUnique({ where: { id: acme.id } }));
  });
});
