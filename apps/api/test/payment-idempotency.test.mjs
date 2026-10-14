/**
 * Payment idempotency (D16, owner decision 2026-10-10).
 *
 * A payment submit retried after a timeout or a double click recorded the
 * payment twice. With an Idempotency-Key header the API records it once and
 * returns that same payment to every repeat; the same key with a different
 * payment is refused. A unique (tenantId, idempotencyKey) constraint makes the
 * database the guarantee under concurrency.
 *
 * MIGRATION-GATED: needs migration *_payment_idempotency_key applied.
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

const RUN = `pi${Date.now().toString(36)}`;
const PASSWORD = 'FinanceRulesPass123!';
const SCOPE = `CLIENT-${RUN}`;

let app;
let server;
let request;
let prisma;
let token = '';
let tenantId = '';
let n = 0;

async function invoice(status, currency = 'EUR') {
  n += 1;
  return prisma.invoice.create({
    data: {
      tenantId,
      invoiceNumber: `${RUN}-${n}`,
      status,
      currency,
      clientVisible: true,
      clientScopeKey: SCOPE,
      subtotalCents: 10000,
      totalCents: 10000,
      issuedAt: status === 'DRAFT' ? null : new Date(),
    },
    select: { id: true },
  });
}

const pay = (body, key) => {
  const req = request(server).post('/api/payments').set('Authorization', `Bearer ${token}`);
  if (key !== undefined) req.set('Idempotency-Key', key);
  return req.send(body);
};
const state = async (id) => ({
  invoice: await prisma.invoice.findUnique({ where: { id }, select: { status: true, paidCents: true } }),
  payments: await prisma.payment.count({ where: { invoiceId: id } }),
  revenue: await prisma.revenueRecord.count({ where: { invoiceId: id } }),
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
  server = app.getHttpServer();
  request = require('supertest');
  const { PrismaService } = require(join(apiRoot, 'dist/modules/prisma/prisma.service.js'));
  prisma = app.get(PrismaService);

  const bcrypt = require('bcrypt');
  const tenant = await prisma.tenant.create({ data: { name: `Tenant ${RUN}`, slug: `tenant-${RUN}`, status: 'ACTIVE' }, select: { id: true } });
  tenantId = tenant.id;
  const user = await prisma.user.create({
    data: { email: `owner-${RUN}@example.test`, displayName: 'owner', passwordHash: await bcrypt.hash(PASSWORD, 10), status: 'APPROVED' },
    select: { id: true },
  });
  await prisma.tenantMembership.create({ data: { tenantId, userId: user.id, role: 'OWNER', status: 'ACTIVE', visibilityScope: 'TENANT_WIDE' } });
  const res = await request(server).post('/api/auth/login').send({ email: `owner-${RUN}@example.test`, passwordOrMagicCode: PASSWORD, tenantSlug: `tenant-${RUN}` });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  token = res.body.tokens.accessToken;
});

after(async () => {
  if (app) await app.close();
});

let k = 0;
const newKey = () => `submit-${RUN}-${(k += 1)}`;
const paymentsOf = (invoiceId) => prisma.payment.count({ where: { invoiceId } });

describe('payment idempotency', { skip }, () => {
  it('records a repeated submit once and returns the same payment', async () => {
    const inv = await invoice('SENT');
    const key = newKey();
    const first = await pay({ invoiceId: inv.id, amountCents: 4000, currency: 'EUR' }, key);
    const again = await pay({ invoiceId: inv.id, amountCents: 4000, currency: 'EUR' }, key);
    assert.equal(first.status, 201, JSON.stringify(first.body));
    assert.equal(again.status, 201, JSON.stringify(again.body));
    assert.equal(first.body.replayed, false);
    assert.equal(again.body.replayed, true);
    assert.equal(again.body.payment.id, first.body.payment.id);
    assert.equal(await paymentsOf(inv.id), 1);
    assert.equal((await state(inv.id)).invoice.paidCents, 4000);
  });

  it('replays a settling payment instead of refusing it as an overpayment', async () => {
    const inv = await invoice('SENT');
    const key = newKey();
    assert.equal((await pay({ invoiceId: inv.id, amountCents: 10000, currency: 'EUR' }, key)).status, 201);
    const again = await pay({ invoiceId: inv.id, amountCents: 10000, currency: 'EUR' }, key);
    assert.equal(again.status, 201, JSON.stringify(again.body));
    assert.equal(again.body.replayed, true);
    assert.deepEqual(await state(inv.id), { invoice: { status: 'PAID', paidCents: 10000 }, payments: 1, revenue: 1 });
  });

  it('refuses the same key for a different payment (409) and records nothing new', async () => {
    const inv = await invoice('SENT');
    const key = newKey();
    assert.equal((await pay({ invoiceId: inv.id, amountCents: 1000, currency: 'EUR' }, key)).status, 201);
    const other = await pay({ invoiceId: inv.id, amountCents: 2000, currency: 'EUR' }, key);
    assert.equal(other.status, 409, JSON.stringify(other.body));
    assert.match(JSON.stringify(other.body), /IDEMPOTENCY_KEY_REUSED/);
    assert.equal(await paymentsOf(inv.id), 1);
  });

  it('concurrent submits with one key record exactly one payment', async () => {
    const inv = await invoice('SENT');
    const key = newKey();
    const results = await Promise.all(
      Array.from({ length: 4 }, () => pay({ invoiceId: inv.id, amountCents: 2500, currency: 'EUR' }, key)),
    );
    assert.deepEqual(results.map((r) => r.status), [201, 201, 201, 201], JSON.stringify(results.map((r) => r.body)));
    assert.equal(new Set(results.map((r) => r.body.payment.id)).size, 1);
    assert.equal(await paymentsOf(inv.id), 1);
  });

  it('works for payments without an invoice, including concurrent repeats', async () => {
    const key = newKey();
    const results = await Promise.all(Array.from({ length: 3 }, () => pay({ amountCents: 700, currency: 'EUR' }, key)));
    assert.equal(new Set(results.map((r) => r.body.payment?.id)).size, 1, JSON.stringify(results.map((r) => r.body)));
    assert.equal(await prisma.payment.count({ where: { tenantId, idempotencyKey: key } }), 1);
  });

  it('refuses a malformed key and leaves requests without a key unchanged', async () => {
    const inv = await invoice('SENT');
    for (const bad of ['short', 'has space key', 'x'.repeat(101)]) {
      assert.equal((await pay({ invoiceId: inv.id, amountCents: 100, currency: 'EUR' }, bad)).status, 400, bad);
    }
    assert.equal((await pay({ invoiceId: inv.id, amountCents: 100, currency: 'EUR' })).status, 201);
    assert.equal((await pay({ invoiceId: inv.id, amountCents: 100, currency: 'EUR' })).status, 201);
    assert.equal(await paymentsOf(inv.id), 2);
  });
});
