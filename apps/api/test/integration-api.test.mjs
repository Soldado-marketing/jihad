/**
 * Phase 5 - HTTP integration tests.
 *
 * These run the real Nest application against a real PostgreSQL database and
 * drive it over HTTP with supertest. Everything else in test/ inspects source;
 * this file exercises behaviour end to end.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * STATUS: GREEN. 34/34 against PostgreSQL 15 (docker-compose.dev.yml) on a
 * freshly migrated database.
 *
 * The first run earned its keep: it caught two real defects.
 *   1. CreateInvoiceDto.lines was missing @Type(() => CreateInvoiceLineDto), so
 *      the global ValidationPipe rejected every line property and invoice
 *      creation with line items returned 400.
 *   2. StorageService.getMaxUploadBytes() resolved the whole storage config, so
 *      an unconfigured deployment answered 503 to a malformed upload that
 *      should have been rejected as 400 before storage was consulted.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Requirements:
 *   1. npm run build                     (this file imports from dist/)
 *   2. npx prisma migrate deploy         (against an EMPTY database)
 *   3. DATABASE_URL + JWT_SECRET set
 *   4. MAOS_INTEGRATION=1
 *
 * Without those the whole suite skips rather than failing, so it never turns
 * an unconfigured machine into a red build.
 *
 * Run: MAOS_INTEGRATION=1 node --test test/integration-api.test.mjs
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

/** Unique per run so repeated runs against one database do not collide. */
const RUN_ID = `it${Date.now().toString(36)}`;

let app;
let server;
let request;
let ownerToken;

before(async () => {
  if (skip) return;

  require('reflect-metadata');
  const { NestFactory } = require('@nestjs/core');
  const { ValidationPipe } = require('@nestjs/common');
  const { AppModule } = require(join(apiRoot, 'dist/app.module.js'));
  const { AllExceptionsFilter } = require(join(apiRoot, 'dist/common/http/all-exceptions.filter.js'));

  app = await NestFactory.create(AppModule, { logger: false });
  // Mirror main.ts so the tests exercise the same request pipeline.
  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }),
  );
  await app.init();

  server = app.getHttpServer();
  request = require('supertest');
});

after(async () => {
  if (app) await app.close();
});

// ── Liveness and readiness ────────────────────────────────────────────────────

describe('health', { skip }, () => {
  it('answers liveness', async () => {
    const res = await request(server).get('/api/health');
    assert.equal(res.status, 200);
  });

  it('answers readiness once the database is reachable', async () => {
    const res = await request(server).get('/api/health/ready');
    assert.equal(res.status, 200);
  });
});

// ── Authentication boundary ───────────────────────────────────────────────────

describe('unauthenticated access', { skip }, () => {
  const protectedRoutes = [
    ['get', '/api/files'],
    ['post', '/api/files'],
    ['get', '/api/files/anything/versions'],
    ['post', '/api/files/anything/versions'],
    ['get', '/api/files/a/versions/b/content'],
    ['get', '/api/invoices'],
    ['post', '/api/invoices'],
    ['get', '/api/invoices/anything/pdf'],
    ['post', '/api/invoices/anything/send'],
    ['get', '/api/payments'],
    ['post', '/api/payments'],
    ['get', '/api/client/invoices'],
    ['get', '/api/client/payments'],
    ['get', '/api/finance/profitability'],
  ];

  for (const [method, path] of protectedRoutes) {
    it(`rejects ${method.toUpperCase()} ${path}`, async () => {
      const res = await request(server)[method](path);
      assert.equal(res.status, 401, `expected 401 for ${path}, got ${res.status}`);
    });
  }
});

// ── Owner session ─────────────────────────────────────────────────────────────

describe('owner bootstrap and login', { skip }, () => {
  const owner = {
    email: `owner-${RUN_ID}@example.test`,
    fullName: 'Integration Owner',
    password: 'IntegrationPass123!',
    tenantName: `Tenant ${RUN_ID}`,
    tenantSlug: `tenant-${RUN_ID}`,
  };

  it('bootstraps the first owner', async () => {
    const res = await request(server).post('/api/auth/bootstrap').send(owner);
    // 403 means an owner already exists in this database - bootstrap is
    // one-time, so a re-run against a used database is expected to be refused.
    assert.ok(
      [200, 201, 403].includes(res.status),
      `unexpected bootstrap status ${res.status}: ${JSON.stringify(res.body)}`,
    );
  });

  it('logs in and returns an access token', async () => {
    const res = await request(server).post('/api/auth/login').send({
      email: owner.email,
      passwordOrMagicCode: owner.password,
      tenantSlug: owner.tenantSlug,
    });

    assert.equal(res.status, 200, `login failed: ${JSON.stringify(res.body)}`);
    // login returns { user, tenant, tokens: { accessToken, refreshToken, expiresIn } }
    assert.ok(res.body.tokens?.accessToken, 'expected tokens.accessToken');
    ownerToken = res.body.tokens.accessToken;
  });

  it('never returns a password hash from /auth/me', async () => {
    const res = await request(server)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${ownerToken}`);

    assert.equal(res.status, 200);
    assert.doesNotMatch(JSON.stringify(res.body), /passwordHash/i);
  });
});

// ── File assets and versions ──────────────────────────────────────────────────

describe('file storage', { skip }, () => {
  let fileId;

  const auth = (req) => req.set('Authorization', `Bearer ${ownerToken}`);

  it('creates a file asset', async () => {
    const res = await auth(request(server).post('/api/files')).send({
      name: `Brief ${RUN_ID}`,
      visibility: 'INTERNAL',
    });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.ok(res.body.id);
    fileId = res.body.id;
  });

  it('rejects an unknown field on create', async () => {
    const res = await auth(request(server).post('/api/files')).send({
      name: 'Whitelist check',
      storageKey: 'tenants/other/evil',
    });

    // whitelist + forbidNonWhitelisted must reject a client-supplied key.
    assert.equal(res.status, 400, JSON.stringify(res.body));
  });

  it('lists versions and never exposes a storage key', async () => {
    const res = await auth(request(server).get(`/api/files/${fileId}/versions`));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
    assert.doesNotMatch(JSON.stringify(res.body), /storageKey/);
  });

  it('404s for a file id that does not exist', async () => {
    const res = await auth(request(server).get('/api/files/nonexistent-id/versions'));
    assert.equal(res.status, 404);
  });

  it('refuses a disallowed file type', async () => {
    const res = await auth(request(server).post(`/api/files/${fileId}/versions`))
      .attach('file', Buffer.from('<svg onload=alert(1)>'), 'payload.svg');

    // The multer fileFilter drops the part, so no file reaches the handler.
    assert.equal(res.status, 400, JSON.stringify(res.body));
  });

  it('refuses content that does not match its extension', async () => {
    const res = await auth(request(server).post(`/api/files/${fileId}/versions`))
      .attach('file', Buffer.from('this is definitely not a png'), 'fake.png');

    assert.equal(res.status, 400, JSON.stringify(res.body));
    assert.match(JSON.stringify(res.body), /UNSUPPORTED_FILE_TYPE/);
  });

  it('reports 503 when object storage is not configured', async function () {
    if (process.env.S3_BUCKET) return; // storage is configured; not applicable

    const png = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
        '0000000a49444154789c6300010000050001od0a2db40000000049454e44ae426082',
      'hex',
    );

    const res = await auth(request(server).post(`/api/files/${fileId}/versions`))
      .attach('file', png, 'pixel.png');

    assert.equal(res.status, 503, JSON.stringify(res.body));
    assert.match(JSON.stringify(res.body), /STORAGE_NOT_CONFIGURED/);
  });
});

// ── Invoicing, payment, revenue ───────────────────────────────────────────────

describe('invoicing', { skip }, () => {
  let invoiceId;
  const auth = (req) => req.set('Authorization', `Bearer ${ownerToken}`);

  it('computes totals from the lines, not from the request', async () => {
    const res = await auth(request(server).post('/api/invoices')).send({
      invoiceNumber: `INV-${RUN_ID}`,
      currency: 'EUR',
      lines: [
        { description: 'Workshop', quantity: 2, unitAmountCents: 75000 },
        { description: 'Design', quantity: 1, unitAmountCents: 100000 },
      ],
    });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.subtotalCents, 250000);
    assert.equal(res.body.totalCents, 250000);
    assert.equal(res.body.paidCents, 0);
    assert.equal(res.body.status, 'DRAFT');
    invoiceId = res.body.id;
  });

  it('renders a PDF', async () => {
    const res = await auth(request(server).get(`/api/invoices/${invoiceId}/pdf`))
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'application/pdf');
    assert.equal(res.body.subarray(0, 5).toString('ascii'), '%PDF-');
  });

  it('hides a DRAFT invoice from the client portal', async () => {
    const list = await auth(request(server).get('/api/client/invoices'));
    assert.equal(list.status, 200);
    assert.ok(
      !JSON.stringify(list.body).includes(invoiceId),
      'a DRAFT invoice must not appear in the client portal',
    );

    const detail = await auth(request(server).get(`/api/client/invoices/${invoiceId}`));
    assert.equal(detail.status, 404);
  });

  it('marks the invoice PARTIALLY_PAID after a partial payment', async () => {
    const res = await auth(request(server).post('/api/payments')).send({
      invoiceId,
      amountCents: 100000,
      currency: 'EUR',
      method: 'BANK_TRANSFER',
    });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.invoice.paidCents, 100000);
    assert.equal(res.body.invoice.status, 'PARTIALLY_PAID');
  });

  it('marks the invoice PAID once settled and posts revenue exactly once', async () => {
    const res = await auth(request(server).post('/api/payments')).send({
      invoiceId,
      amountCents: 150000,
      currency: 'EUR',
      method: 'BANK_TRANSFER',
    });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.invoice.paidCents, 250000);
    assert.equal(res.body.invoice.status, 'PAID');

    // A further payment must not post revenue a second time.
    await auth(request(server).post('/api/payments')).send({
      invoiceId,
      amountCents: 1,
      currency: 'EUR',
    });

    const revenue = await auth(request(server).get('/api/finance/revenue'));
    assert.equal(revenue.status, 200);
    const forInvoice = revenue.body.filter((row) => row.invoiceId === invoiceId);
    assert.equal(forInvoice.length, 1, 'revenue must be posted exactly once per invoice');
    assert.equal(forInvoice[0].amountCents, 250000);
  });

  it('rejects a non-positive payment', async () => {
    const res = await auth(request(server).post('/api/payments')).send({
      invoiceId,
      amountCents: 0,
      currency: 'EUR',
    });

    assert.equal(res.status, 400, JSON.stringify(res.body));
  });

  it('404s when attaching a payment to an unknown invoice', async () => {
    const res = await auth(request(server).post('/api/payments')).send({
      invoiceId: 'no-such-invoice',
      amountCents: 500,
      currency: 'EUR',
    });

    assert.equal(res.status, 404, JSON.stringify(res.body));
  });

  it('reports profitability including the posted revenue', async () => {
    const res = await auth(request(server).get('/api/finance/profitability'));
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.projects));
  });
});
