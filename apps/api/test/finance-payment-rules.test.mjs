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
