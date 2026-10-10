/**
 * Default invoice recipients are the invoice's own client only (MAOS-T37).
 *
 * When an invoice is sent without explicit recipients, the default used to be
 * every CLIENT member of the invoice's project - including another client's
 * members on a shared project, suspended memberships and non-active users.
 * These tests prove the default is restricted to CLIENT members whose
 * membership is ACTIVE, whose user may hold a session, and whose
 * clientScopeKey matches the invoice's, and that an invoice without a client
 * scope has no default recipient at all.
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

const RUN = `ir${Date.now().toString(36)}`;
const PASSWORD = 'RecipientsPass123!';
const SCOPE_A = `A-${RUN}`;
const SCOPE_B = `B-${RUN}`;

let app;
let server;
let request;
let prisma;
let repo;
let token = '';
let tenantId = '';
let projectId = '';
const email = (label) => `${label}-${RUN}@example.test`;

async function member(label, { role = 'CLIENT', scope = SCOPE_A, membershipStatus = 'ACTIVE', userStatus = 'APPROVED', onProject = true } = {}) {
  const bcrypt = require('bcrypt');
  const user = await prisma.user.create({
    data: { email: email(label), displayName: label, passwordHash: await bcrypt.hash(PASSWORD, 10), status: userStatus },
    select: { id: true },
  });
  await prisma.tenantMembership.create({
    data: { tenantId, userId: user.id, role, status: membershipStatus, visibilityScope: role === 'CLIENT' ? 'CLIENT_LEVEL' : 'TENANT_WIDE', clientScopeKey: role === 'CLIENT' ? scope : null },
  });
  if (onProject) await prisma.projectMember.create({ data: { tenantId, projectId, userId: user.id } });
  return user;
}

async function invoiceFor(scope) {
  return prisma.invoice.create({
    data: { tenantId, projectId, invoiceNumber: `${RUN}-${scope ?? 'none'}`, status: 'SENT', clientVisible: true, clientScopeKey: scope, currency: 'EUR', subtotalCents: 100, totalCents: 100 },
    select: { id: true },
  });
}

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

  const tenant = await prisma.tenant.create({ data: { name: `Tenant ${RUN}`, slug: `tenant-${RUN}`, status: 'ACTIVE' }, select: { id: true } });
  tenantId = tenant.id;
  const project = await prisma.project.create({ data: { tenantId, name: `Shared project ${RUN}` }, select: { id: true } });
  projectId = project.id;

  await member('owner', { role: 'OWNER', onProject: false });
  await member('client-a');
  await member('client-b', { scope: SCOPE_B });
  await member('client-a-suspended-membership', { membershipStatus: 'SUSPENDED' });
  await member('client-a-suspended-user', { userStatus: 'SUSPENDED' });
  await member('client-a-not-on-project', { onProject: false });
  await member('employee-on-project', { role: 'EMPLOYEE' });
  // A CLIENT approved without a client scope (see ledger F-1): never a default
  // recipient, and must not match an invoice that has no client scope either.
  await member('client-without-scope', { scope: null });

  const res = await request(server).post('/api/auth/login').send({ email: email('owner'), passwordOrMagicCode: PASSWORD, tenantSlug: `tenant-${RUN}` });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  token = res.body.tokens.accessToken;
});

after(async () => {
  if (app) await app.close();
});

describe('default invoice recipients', { skip }, () => {
  it("are only the ACTIVE CLIENT members of the invoice's own client on the project", async () => {
    const rows = await repo.findProjectClientEmails(tenantId, projectId, SCOPE_A);
    assert.deepEqual(rows.map((r) => r.email).sort(), [email('client-a')]);
  });

  it('give another client only its own member', async () => {
    const rows = await repo.findProjectClientEmails(tenantId, projectId, SCOPE_B);
    assert.deepEqual(rows.map((r) => r.email).sort(), [email('client-b')]);
  });

  it('are empty for an invoice without a client scope', async () => {
    assert.deepEqual(await repo.findProjectClientEmails(tenantId, projectId, null), []);
  });

  it('send: an invoice of client A reaches the mail step (a recipient exists)', async () => {
    const inv = await invoiceFor(SCOPE_A);
    const res = await request(server).post(`/api/invoices/${inv.id}/send`).set('Authorization', `Bearer ${token}`).send({});
    // No mail provider in tests: a resolved recipient means 503 MAIL_NOT_CONFIGURED.
    assert.equal(res.status, 503, JSON.stringify(res.body));
  });

  it('send: an invoice without a client scope has no default recipient (400)', async () => {
    const inv = await invoiceFor(null);
    const res = await request(server).post(`/api/invoices/${inv.id}/send`).set('Authorization', `Bearer ${token}`).send({});
    assert.equal(res.status, 400, JSON.stringify(res.body));
    assert.match(JSON.stringify(res.body), /NO_RECIPIENT/);
  });
});
