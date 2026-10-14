/**
 * Invoice revenue is posted exactly once - enforced by the database (MAOS-T40).
 *
 * postRevenueOnce checked for an existing record and then inserted. Two
 * concurrent settlements of one invoice could both pass the check and post
 * revenue twice. A unique (tenantId, invoiceId) constraint now makes the
 * database the guarantee; the losing insert is treated as "already posted".
 *
 * MIGRATION-GATED: needs migration *_revenue_record_unique_invoice applied.
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

const RUN = `rv${Date.now().toString(36)}`;

let app;
let server;
let request;
let prisma;
let tenantId = '';
let n = 0;

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

  const tenant = await prisma.tenant.create({ data: { name: `Tenant ${RUN}`, slug: `tenant-${RUN}`, status: 'ACTIVE' }, select: { id: true } });
  tenantId = tenant.id;
  const { InvoicesRepository } = require(join(apiRoot, 'dist/modules/invoices/invoices.repository.js'));
  repo = app.get(InvoicesRepository);
});

after(async () => {
  if (app) await app.close();
});

let repo;
async function newInvoice() {
  n += 1;
  return prisma.invoice.create({
    data: { tenantId, invoiceNumber: `${RUN}-${n}`, currency: 'EUR', status: 'PAID', totalCents: 1000, paidCents: 1000 },
    select: { id: true },
  });
}
const post = (invoiceId) =>
  repo.postRevenueOnce({ tenantId, invoiceId, projectId: null, clientScopeKey: null, amountCents: 1000, currency: 'EUR' });
const revenueRows = (invoiceId) => prisma.revenueRecord.count({ where: { tenantId, invoiceId } });

describe('revenue posting uniqueness', { skip }, () => {
  it('the database refuses a second revenue record for the same invoice', async () => {
    const inv = await newInvoice();
    const row = { tenantId, sourceType: 'invoice', amountCents: 1000, currency: 'EUR', invoiceId: inv.id };
    await prisma.revenueRecord.create({ data: row });
    await assert.rejects(prisma.revenueRecord.create({ data: row }), (e) => e.code === 'P2002');
  });

  it('still allows any number of revenue records without an invoice', async () => {
    for (let i = 0; i < 3; i += 1) {
      await prisma.revenueRecord.create({ data: { tenantId, sourceType: 'manual', amountCents: 1, currency: 'EUR' } });
    }
    assert.equal(await prisma.revenueRecord.count({ where: { tenantId, invoiceId: null } }), 3);
  });

  it('posts once and reports "already posted" afterwards', async () => {
    const inv = await newInvoice();
    assert.deepEqual(await post(inv.id), { created: true });
    assert.deepEqual(await post(inv.id), { created: false });
    assert.equal(await revenueRows(inv.id), 1);
  });

  it('treats a concurrent insert that wins the race as "already posted"', async () => {
    // Deterministic race: this transaction is the other settlement. Its row is
    // uncommitted, so postRevenueOnce's pre-check cannot see it; the insert
    // then waits on the unique index and fails once this commits.
    const inv = await newInvoice();
    let pending;
    await prisma.$transaction(
      async (tx) => {
        await tx.revenueRecord.create({
          data: { tenantId, sourceType: 'invoice', amountCents: 1000, currency: 'EUR', invoiceId: inv.id },
        });
        pending = post(inv.id);
        await new Promise((resolve) => setTimeout(resolve, 400));
      },
      { timeout: 10000 },
    );
    assert.deepEqual(await pending, { created: false });
    assert.equal(await revenueRows(inv.id), 1);
  });

  it('many concurrent postings of one invoice create exactly one record', async () => {
    const inv = await newInvoice();
    const results = await Promise.all(Array.from({ length: 6 }, () => post(inv.id)));
    assert.equal(results.filter((r) => r.created).length, 1);
    assert.equal(await revenueRows(inv.id), 1);
  });
});
