/**
 * Finance - payment rules on invoices (MAOS-T34).
 *
 * Before this change a payment could be recorded against a DRAFT invoice
 * (which then became PAID and posted revenue without ever being issued) or a
 * VOID invoice, in a different currency from the invoice, and with a
 * clientScopeKey that differed from its invoice - which would show the payment
 * in another client's portal. These tests drive the real app over HTTP and
 * prove each rule, that a refused payment writes nothing and changes nothing,
 * and that a valid payment still works.
 *
 * D16 (owner decision 2026-10-10): a payment may not take an invoice above its
 * total. The check and the insert run under a row lock on the invoice, so
 * concurrent payments cannot together overpay it.
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

const RUN = `fp${Date.now().toString(36)}`;
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

const pay = (body) => request(server).post('/api/payments').set('Authorization', `Bearer ${token}`).send(body);
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

describe('payment rules', { skip }, () => {
  it('records a valid payment and derives the client scope from the invoice (control)', async () => {
    const inv = await invoice('SENT');
    const res = await pay({ invoiceId: inv.id, amountCents: 4000, currency: 'eur' });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const s = await state(inv.id);
    assert.equal(s.invoice.status, 'PARTIALLY_PAID');
    assert.equal(s.invoice.paidCents, 4000);
    const p = await prisma.payment.findFirst({ where: { invoiceId: inv.id } });
    assert.equal(p.clientScopeKey, SCOPE);
    assert.equal(p.currency, 'EUR');
  });

  for (const status of ['DRAFT', 'VOID']) {
    it(`refuses a payment on a ${status} invoice (409) and changes nothing`, async () => {
      const inv = await invoice(status);
      const res = await pay({ invoiceId: inv.id, amountCents: 10000, currency: 'EUR' });
      assert.equal(res.status, 409, JSON.stringify(res.body));
      const s = await state(inv.id);
      assert.deepEqual(s, { invoice: { status, paidCents: 0 }, payments: 0, revenue: 0 });
    });
  }

  it('refuses a currency that differs from the invoice (400) and writes nothing', async () => {
    const inv = await invoice('SENT', 'EUR');
    const res = await pay({ invoiceId: inv.id, amountCents: 10000, currency: 'USD' });
    assert.equal(res.status, 400, JSON.stringify(res.body));
    const s = await state(inv.id);
    assert.deepEqual(s, { invoice: { status: 'SENT', paidCents: 0 }, payments: 0, revenue: 0 });
  });

  it('refuses a currency that is not a 3-letter code (400)', async () => {
    for (const currency of ['E1', 'EURO', '€€€', '']) {
      const res = await pay({ amountCents: 100, currency });
      assert.equal(res.status, 400, `${currency}: ${JSON.stringify(res.body)}`);
    }
  });

  it("refuses a clientScopeKey that differs from the invoice's (400) and writes nothing", async () => {
    const inv = await invoice('SENT');
    const res = await pay({ invoiceId: inv.id, amountCents: 1000, currency: 'EUR', clientScopeKey: 'SOME-OTHER-CLIENT' });
    assert.equal(res.status, 400, JSON.stringify(res.body));
    assert.equal((await state(inv.id)).payments, 0);
  });

  it("accepts the invoice's own clientScopeKey when it is sent explicitly", async () => {
    const inv = await invoice('SENT');
    const res = await pay({ invoiceId: inv.id, amountCents: 1000, currency: 'EUR', clientScopeKey: SCOPE });
    assert.equal(res.status, 201, JSON.stringify(res.body));
  });

  it('still settles an invoice in full and posts revenue once (control)', async () => {
    const inv = await invoice('SENT');
    assert.equal((await pay({ invoiceId: inv.id, amountCents: 10000, currency: 'EUR' })).status, 201);
    const s = await state(inv.id);
    assert.equal(s.invoice.status, 'PAID');
    assert.equal(s.revenue, 1);
  });
});

describe('overpayment (D16)', { skip }, () => {
  it('refuses a payment above the remaining balance with 409 and the remaining amount', async () => {
    const inv = await invoice('SENT');
    assert.equal((await pay({ invoiceId: inv.id, amountCents: 6000, currency: 'EUR' })).status, 201);
    const res = await pay({ invoiceId: inv.id, amountCents: 4001, currency: 'EUR' });
    assert.equal(res.status, 409, JSON.stringify(res.body));
    assert.match(JSON.stringify(res.body), /OVERPAYMENT/);
    assert.match(JSON.stringify(res.body), /"remainingCents":4000/);
    const s = await state(inv.id);
    assert.deepEqual(s, { invoice: { status: 'PARTIALLY_PAID', paidCents: 6000 }, payments: 1, revenue: 0 });
  });

  it('accepts exactly the remaining balance (control)', async () => {
    const inv = await invoice('SENT');
    assert.equal((await pay({ invoiceId: inv.id, amountCents: 6000, currency: 'EUR' })).status, 201);
    assert.equal((await pay({ invoiceId: inv.id, amountCents: 4000, currency: 'EUR' })).status, 201);
    const s = await state(inv.id);
    assert.equal(s.invoice.status, 'PAID');
    assert.equal(s.invoice.paidCents, 10000);
  });

  it('refuses any further payment on a fully paid invoice and posts no extra revenue', async () => {
    const inv = await invoice('SENT');
    assert.equal((await pay({ invoiceId: inv.id, amountCents: 10000, currency: 'EUR' })).status, 201);
    const res = await pay({ invoiceId: inv.id, amountCents: 1, currency: 'EUR' });
    assert.equal(res.status, 409);
    assert.match(JSON.stringify(res.body), /"remainingCents":0/);
    assert.deepEqual(await state(inv.id), { invoice: { status: 'PAID', paidCents: 10000 }, payments: 1, revenue: 1 });
  });

  it('lets only one of two concurrent payments for the full remainder through', async () => {
    const inv = await invoice('SENT');
    const results = await Promise.all([
      pay({ invoiceId: inv.id, amountCents: 10000, currency: 'EUR' }),
      pay({ invoiceId: inv.id, amountCents: 10000, currency: 'EUR' }),
      pay({ invoiceId: inv.id, amountCents: 10000, currency: 'EUR' }),
    ]);
    const codes = results.map((r) => r.status).sort();
    assert.deepEqual(codes, [201, 409, 409], JSON.stringify(results.map((r) => r.body)));
    const s = await state(inv.id);
    assert.equal(s.payments, 1);
    assert.equal(s.invoice.paidCents, 10000);
    assert.equal(s.revenue, 1);
  });

  it('waits for an in-flight payment on the same invoice, then refuses the overpayment', async () => {
    // Deterministic race: this transaction plays a concurrent request that has
    // passed its balance check and inserted a full payment but not committed.
    // With the row lock the API request blocks until the commit, then sees the
    // payment and refuses. Without it, the request would not see the
    // uncommitted row and would record a second full payment.
    const inv = await invoice('SENT');
    let pending;
    await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Invoice" WHERE "id" = ${inv.id} FOR UPDATE`;
        await tx.payment.create({
          data: { tenantId, invoiceId: inv.id, amountCents: 10000, currency: 'EUR', receivedAt: new Date() },
        });
        pending = pay({ invoiceId: inv.id, amountCents: 10000, currency: 'EUR' }).then((r) => r);
        await new Promise((resolve) => setTimeout(resolve, 400));
      },
      { timeout: 10000 },
    );
    const res = await pending;
    assert.equal(res.status, 409, JSON.stringify(res.body));
    assert.equal((await state(inv.id)).payments, 1);
  });

  it('does not limit a payment recorded as FAILED (it never counts towards the balance)', async () => {
    const inv = await invoice('SENT');
    assert.equal((await pay({ invoiceId: inv.id, amountCents: 10000, currency: 'EUR' })).status, 201);
    const res = await pay({ invoiceId: inv.id, amountCents: 5000, currency: 'EUR', status: 'FAILED' });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal((await state(inv.id)).invoice.paidCents, 10000);
  });

  it('leaves payments without an invoice unlimited (control)', async () => {
    assert.equal((await pay({ amountCents: 999999, currency: 'EUR' })).status, 201);
  });
});
