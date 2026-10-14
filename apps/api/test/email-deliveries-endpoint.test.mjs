/**
 * Email delivery tracking - storage and read endpoint (MAOS-T44).
 *
 * Writes rows through the real repository into the migrated EmailMessage
 * table and reads them through GET /api/invoices/:id/deliveries, proving:
 *   - one row per recipient, recipient normalised to lower case, SENT/FAILED;
 *   - the endpoint is tenant-scoped (another tenant's invoice is 404);
 *   - a CLIENT cannot read delivery records (internal data).
 *
 * Prerequisites (otherwise the whole suite skips rather than failing):
 *   npm run build; migrated PostgreSQL; DATABASE_URL + JWT_SECRET; MAOS_INTEGRATION=1.
 * Seeds its own tenants directly, so it shares a database with the other suites.
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

const RUN = `ed${Date.now().toString(36)}`;
const PASSWORD = 'DeliveriesPass123!';

let app;
let server;
let request;
let prisma;
let repo;
const home = {};
const other = {};

async function tenantWith(label) {
  const bcrypt = require('bcrypt');
  const tenant = await prisma.tenant.create({ data: { name: `${label} ${RUN}`, slug: `${label}-${RUN}`, status: 'ACTIVE' }, select: { id: true, slug: true } });
  const invoice = await prisma.invoice.create({
    data: { tenantId: tenant.id, invoiceNumber: `${label}-${RUN}`, status: 'SENT', clientVisible: true, clientScopeKey: 'A', currency: 'EUR', subtotalCents: 100, totalCents: 100 },
    select: { id: true },
  });
  const login = async (role, extra = {}) => {
    const user = await prisma.user.create({
      data: { email: `${label}-${role.toLowerCase()}-${RUN}@example.test`, displayName: role, passwordHash: await bcrypt.hash(PASSWORD, 10), status: 'APPROVED' },
      select: { id: true, email: true },
    });
    await prisma.tenantMembership.create({ data: { tenantId: tenant.id, userId: user.id, role, status: 'ACTIVE', visibilityScope: role === 'CLIENT' ? 'CLIENT_LEVEL' : 'TENANT_WIDE', ...extra } });
    const res = await request(server).post('/api/auth/login').send({ email: user.email, passwordOrMagicCode: PASSWORD, tenantSlug: tenant.slug });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return res.body.tokens.accessToken;
  };
  return { tenantId: tenant.id, invoiceId: invoice.id, login };
}

const deliveries = (token, invoiceId) =>
  request(server).get(`/api/invoices/${invoiceId}/deliveries`).set('Authorization', `Bearer ${token}`);

before(async () => {
  if (skip) return;
  require('reflect-metadata');
  const { NestFactory } = require('@nestjs/core');
  const { ValidationPipe } = require('@nestjs/common');
  const { AppModule } = require(join(apiRoot, 'dist/app.module.js'));
  const { AllExceptionsFilter } = require(join(apiRoot, 'dist/common/http/all-exceptions.filter.js'));
  const { InvoicesRepository } = require(join(apiRoot, 'dist/modules/invoices/invoices.repository.js'));
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));
  await app.init();
  server = app.getHttpServer();
  request = require('supertest');
  const { PrismaService } = require(join(apiRoot, 'dist/modules/prisma/prisma.service.js'));
  prisma = app.get(PrismaService);
  repo = app.get(InvoicesRepository);

  Object.assign(home, await tenantWith('home'));
  Object.assign(other, await tenantWith('other'));
  home.ownerToken = await home.login('OWNER');
  home.clientToken = await home.login('CLIENT', { clientScopeKey: 'A' });

  await repo.recordEmailDeliveries(home.tenantId, 'Invoice', home.invoiceId, [
    { recipient: 'Anna@Client-A.example', accepted: true, providerMessageId: `re_${RUN}_1` },
    { recipient: 'ben@client-a.example', accepted: false, providerMessageId: null },
  ]);
  await repo.recordEmailDeliveries(other.tenantId, 'Invoice', other.invoiceId, [
    { recipient: 'stranger@other.example', accepted: true, providerMessageId: `re_${RUN}_2` },
  ]);
});

after(async () => {
  if (app) await app.close();
});

describe('invoice deliveries', { skip }, () => {
  it('lists one row per recipient with its status, recipient in lower case', async () => {
    const res = await deliveries(home.ownerToken, home.invoiceId);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const byRecipient = Object.fromEntries(res.body.items.map((i) => [i.recipient, i.status]));
    assert.deepEqual(byRecipient, { 'anna@client-a.example': 'SENT', 'ben@client-a.example': 'FAILED' });
    assert.ok(!JSON.stringify(res.body).includes('stranger@other.example'));
  });

  it("refuses another tenant's invoice (404, nothing leaked)", async () => {
    const res = await deliveries(home.ownerToken, other.invoiceId);
    assert.equal(res.status, 404, JSON.stringify(res.body));
    assert.ok(!JSON.stringify(res.body).includes('stranger'));
  });

  it('is not readable by a CLIENT', async () => {
    const res = await deliveries(home.clientToken, home.invoiceId);
    assert.equal(res.status, 403, JSON.stringify(res.body));
  });
});
