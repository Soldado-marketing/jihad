/**
 * Security & Reliability Gate 3 - Client A vs Client B inside ONE tenant.
 *
 * Boots the real application against a real PostgreSQL database, seeds two
 * CLIENT memberships in the same tenant with different clientScopeKey values,
 * gives each one its own project, tasks, files (approved / unapproved /
 * internal), approval and invoice, then asks each client for the other's
 * resources over HTTP.
 *
 * Two halves matter equally:
 *
 *   ISOLATION - A must not reach B, and B must not reach A, on list endpoints,
 *               direct known IDs, file content, and invoice PDFs, with no
 *               metadata leaking through either.
 *   CONTROL   - each client must still reach its OWN resources. Without this an
 *               entirely broken portal would score a perfect isolation result,
 *               which is how the pre-fix probe first read as "secure".
 *
 * A third client with a NULL clientScopeKey covers the fail-closed rule: no
 * scope means no access, never tenant-wide access.
 *
 * Requirements: npm run build, an EMPTY migrated database, DATABASE_URL,
 * JWT_SECRET, MAOS_INTEGRATION=1. Skips rather than fails without them.
 */

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

// Storage is configured to a deliberately unroutable endpoint BEFORE the app is
// required, so the download path gets past its key check and reaches the client
// authorisation branch this gate is about. Nothing is ever uploaded or fetched:
// a refusal is 403 and a pass is the bucket failing, which is what we assert on.
process.env.S3_BUCKET ||= 'gate3-test-bucket';
process.env.S3_REGION ||= 'eu-central-1';
process.env.S3_ACCESS_KEY_ID ||= 'gate3';
process.env.S3_SECRET_ACCESS_KEY ||= 'gate3';
process.env.S3_ENDPOINT = 'http://127.0.0.1:9';
process.env.S3_KEY_PREFIX = '';
process.env.S3_FORCE_PATH_STYLE = 'true';

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

const RUN = `ci${Date.now().toString(36)}`;
const PASSWORD = 'GateCheckPass123!';
const SCOPE_A = 'E2E-TEST-CLIENT-A';
const SCOPE_B = 'E2E-TEST-CLIENT-B';

let app;
let server;
let request;
let prisma;
let tenantId;

const A = { token: '', id: '' };
const B = { token: '', id: '' };
const NOSCOPE = { token: '', id: '' };
let ownerToken = '';

const auth = (token, req) => req.set('Authorization', `Bearer ${token}`);

async function seedMember(label, role, clientScopeKey) {
  const bcrypt = require('bcrypt');
  const email = `${label}-${RUN}@example.test`;

  const user = await prisma.user.create({
    data: {
      email,
      displayName: label,
      passwordHash: await bcrypt.hash(PASSWORD, 10),
      status: 'APPROVED',
    },
    select: { id: true },
  });

  await prisma.tenantMembership.create({
    data: {
      tenantId,
      userId: user.id,
      role,
      status: 'ACTIVE',
      visibilityScope: role === 'CLIENT' ? 'CLIENT_LEVEL' : 'TENANT_WIDE',
      clientScopeKey,
    },
  });

  const res = await request(server)
    .post('/api/auth/login')
    .send({ email, passwordOrMagicCode: PASSWORD, tenantSlug: `tenant-${RUN}` });

  assert.equal(res.status, 200, `login failed for ${label}: ${JSON.stringify(res.body)}`);
  return { id: user.id, token: res.body.tokens.accessToken };
}

/** One client's whole world, every row tagged with its own scope key. */
async function seedWorld(scope) {
  const project = await prisma.project.create({
    data: {
      tenantId,
      name: `${scope}-PROJECT`,
      description: `${scope}-SECRET-DESCRIPTION`,
      clientVisible: true,
      clientScopeKey: scope,
    },
    select: { id: true },
  });

  const task = await prisma.task.create({
    data: {
      tenantId,
      projectId: project.id,
      title: `${scope}-TASK`,
      clientVisible: true,
      clientScopeKey: scope,
    },
    select: { id: true },
  });

  async function makeFile(name, clientVisible, approved) {
    const asset = await prisma.fileAsset.create({
      data: {
        tenantId,
        projectId: project.id,
        name,
        mimeType: 'application/pdf',
        clientVisible,
        visibility: clientVisible ? 'CLIENT_VISIBLE' : 'INTERNAL',
        clientScopeKey: scope,
        versionCount: 1,
      },
      select: { id: true },
    });

    const version = await prisma.fileVersion.create({
      data: {
        tenantId,
        fileAssetId: asset.id,
        versionNumber: 1,
        originalName: `${name}.pdf`,
        storageKey: `tenants/${tenantId}/files/${asset.id}/v1/${scope}-object.pdf`,
        sizeBytes: 10,
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    if (approved) {
      await prisma.approvalRequest.create({
        data: {
          tenantId,
          fileAssetId: asset.id,
          title: `${scope}-APPROVAL`,
          status: 'APPROVED',
          clientVisible: true,
          clientScopeKey: scope,
        },
      });
    }

    return { assetId: asset.id, versionId: version.id };
  }

  const approvedFile = await makeFile(`${scope}-APPROVED-FILE`, true, true);
  const unapprovedFile = await makeFile(`${scope}-UNAPPROVED-FILE`, true, false);
  const internalFile = await makeFile(`${scope}-INTERNAL-FILE`, false, false);

  const invoice = await prisma.invoice.create({
    data: {
      tenantId,
      projectId: project.id,
      invoiceNumber: `${scope}-INV-001`,
      status: 'SENT',
      clientVisible: true,
      clientScopeKey: scope,
      currency: 'EUR',
      subtotalCents: 10000,
      totalCents: 10000,
      issuedAt: new Date(),
    },
    select: { id: true },
  });

  await prisma.payment.create({
    data: {
      tenantId,
      invoiceId: invoice.id,
      amountCents: 2500,
      currency: 'EUR',
      method: 'BANK_TRANSFER',
      status: 'RECORDED',
      receivedAt: new Date(),
      clientScopeKey: scope,
    },
  });

  return { projectId: project.id, taskId: task.id, approvedFile, unapprovedFile, internalFile, invoiceId: invoice.id };
}

let worldA;
let worldB;

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
  app.useGlobalPipes(
    new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }),
  );
  await app.init();

  server = app.getHttpServer();
  request = require('supertest');

  const { PrismaService } = require(join(apiRoot, 'dist/modules/prisma/prisma.service.js'));
  prisma = app.get(PrismaService);

  // Seeded directly rather than through /auth/bootstrap, which is one-time
  // across the whole database and would force this suite to run first.
  const slug = `tenant-${RUN}`;
  const tenant = await prisma.tenant.create({
    data: { name: `Tenant ${RUN}`, slug, status: 'ACTIVE' },
    select: { id: true },
  });
  tenantId = tenant.id;

  const owner = await seedMember('owner', 'OWNER', null);
  ownerToken = owner.token;

  Object.assign(A, await seedMember('clienta', 'CLIENT', SCOPE_A));
  Object.assign(B, await seedMember('clientb', 'CLIENT', SCOPE_B));
  Object.assign(NOSCOPE, await seedMember('noscope', 'CLIENT', null));

  worldA = await seedWorld(SCOPE_A);
  worldB = await seedWorld(SCOPE_B);
});

after(async () => {
  if (app) await app.close();
});

// ── Isolation: the list endpoints ────────────────────────────────────────────

describe('Gate 3 - list endpoints carry one client only', { skip }, () => {
  const cases = [
    ['/api/client/projects', SCOPE_A, SCOPE_B],
    ['/api/client/tasks', SCOPE_A, SCOPE_B],
    ['/api/client/files', SCOPE_A, SCOPE_B],
    ['/api/client/invoices', SCOPE_A, SCOPE_B],
    ['/api/client/payments', SCOPE_A, SCOPE_B],
  ];

  for (const [path, mine, theirs] of cases) {
    it(`${path} shows A its own rows and none of B's`, async () => {
      const res = await auth(A.token, request(server).get(path));
      assert.equal(res.status, 200, JSON.stringify(res.body));

      const body = JSON.stringify(res.body);
      assert.ok(!body.includes(theirs), `${path} leaked ${theirs}`);
      assert.ok(body.includes(mine), `${path} lost A's own rows - isolation must not mean an empty portal`);
    });

    it(`${path} shows B its own rows and none of A's`, async () => {
      const res = await auth(B.token, request(server).get(path));
      assert.equal(res.status, 200, JSON.stringify(res.body));

      const body = JSON.stringify(res.body);
      assert.ok(!body.includes(mine), `${path} leaked ${mine}`);
      assert.ok(body.includes(theirs), `${path} lost B's own rows`);
    });
  }

  it('never exposes a storage key to a client', async () => {
    for (const who of [A, B]) {
      const res = await auth(who.token, request(server).get('/api/client/files'));
      assert.doesNotMatch(JSON.stringify(res.body), /storageKey/);
    }
  });
});

// ── Isolation: direct known IDs ──────────────────────────────────────────────

describe('Gate 3 - direct resource IDs', { skip }, () => {
  const foreign = () => [
    ['/api/client/projects/', worldB.projectId],
    ['/api/client/tasks/', worldB.taskId],
    ['/api/client/invoices/', worldB.invoiceId],
  ];

  for (const label of ['projects', 'tasks', 'invoices']) {
    it(`refuses A a known ${label} id belonging to B`, async () => {
      const [prefix, id] = foreign().find(([p]) => p.includes(label));
      const res = await auth(A.token, request(server).get(prefix + id));

      assert.ok([403, 404].includes(res.status), `expected 403/404, got ${res.status}`);
      assert.doesNotMatch(JSON.stringify(res.body ?? {}), new RegExp(SCOPE_B));
    });
  }

  it('refuses B a known project id belonging to A', async () => {
    const res = await auth(B.token, request(server).get(`/api/client/projects/${worldA.projectId}`));
    assert.ok([403, 404].includes(res.status), `expected 403/404, got ${res.status}`);
    assert.doesNotMatch(JSON.stringify(res.body ?? {}), new RegExp(SCOPE_A));
  });

  it('still serves each client its own ids', async () => {
    const own = await auth(A.token, request(server).get(`/api/client/projects/${worldA.projectId}`));
    assert.equal(own.status, 200);
    assert.equal(own.body.name, `${SCOPE_A}-PROJECT`);

    const invoice = await auth(B.token, request(server).get(`/api/client/invoices/${worldB.invoiceId}`));
    assert.equal(invoice.status, 200);
    assert.equal(invoice.body.invoiceNumber, `${SCOPE_B}-INV-001`);
  });
});

// ── Isolation: file content and invoice PDFs ─────────────────────────────────

describe('Gate 3 - content routes', { skip }, () => {
  const contentPath = (file) => `/api/client/files/${file.assetId}/versions/${file.versionId}/content`;

  it("refuses A the bytes of B's approved file", async () => {
    const res = await auth(A.token, request(server).get(contentPath(worldB.approvedFile)));
    assert.equal(res.status, 403, `expected 403, got ${res.status}`);
    assert.match(JSON.stringify(res.body), /file_outside_client_scope/);
  });

  it("refuses B the bytes of A's approved file", async () => {
    const res = await auth(B.token, request(server).get(contentPath(worldA.approvedFile)));
    assert.equal(res.status, 403);
  });

  it("refuses A B's unapproved and internal files", async () => {
    for (const file of [worldB.unapprovedFile, worldB.internalFile]) {
      const res = await auth(A.token, request(server).get(contentPath(file)));
      assert.equal(res.status, 403);
    }
  });

  it('lets a client past authorisation for its OWN approved file', async () => {
    // The bucket is unroutable here, so the request cannot return bytes. What
    // matters is that it is NOT refused: a 403 would mean the fix locked clients
    // out of their own files rather than out of each other's.
    const res = await auth(A.token, request(server).get(contentPath(worldA.approvedFile)));
    assert.notEqual(res.status, 403, 'a client must still be authorised for its own approved file');
  });

  it('still refuses a client its own UNAPPROVED file', async () => {
    const res = await auth(A.token, request(server).get(contentPath(worldA.unapprovedFile)));
    assert.equal(res.status, 403);
  });

  it("refuses A the PDF of B's invoice but serves its own", async () => {
    const theirs = await auth(A.token, request(server).get(`/api/client/invoices/${worldB.invoiceId}/pdf`));
    assert.equal(theirs.status, 404, `expected 404, got ${theirs.status}`);

    const own = await auth(A.token, request(server).get(`/api/client/invoices/${worldA.invoiceId}/pdf`));
    assert.equal(own.status, 200, 'a client must still get its own invoice PDF');
  });
});

// ── Fail closed: a CLIENT with no scope ──────────────────────────────────────

describe('Gate 3 - a client with no scope sees nothing', { skip }, () => {
  for (const path of [
    '/api/client/projects',
    '/api/client/tasks',
    '/api/client/files',
    '/api/client/invoices',
    '/api/client/payments',
  ]) {
    it(`refuses ${path}`, async () => {
      const res = await auth(NOSCOPE.token, request(server).get(path));
      assert.equal(res.status, 403, `expected 403, got ${res.status}: ${JSON.stringify(res.body)}`);
      assert.match(JSON.stringify(res.body), /client_scope_missing/);
    });
  }

  it('leaks no row of either client in the refusal', async () => {
    const res = await auth(NOSCOPE.token, request(server).get('/api/client/projects'));
    const body = JSON.stringify(res.body);
    assert.ok(!body.includes(SCOPE_A) && !body.includes(SCOPE_B));
  });

  it('never falls back to tenant-wide access on a direct id', async () => {
    const res = await auth(NOSCOPE.token, request(server).get(`/api/client/projects/${worldA.projectId}`));
    assert.ok([403, 404].includes(res.status));
  });
});

// ── Internal roles keep working ──────────────────────────────────────────────

describe('Gate 3 - internal roles are not narrowed', { skip }, () => {
  it('lets an OWNER read the portal across clients', async () => {
    const res = await auth(ownerToken, request(server).get('/api/client/projects'));
    assert.equal(res.status, 200);

    const body = JSON.stringify(res.body);
    assert.ok(body.includes(SCOPE_A) && body.includes(SCOPE_B), 'owner preview must stay tenant-wide');
  });

  it('leaves the internal file list untouched', async () => {
    const res = await auth(ownerToken, request(server).get('/api/files'));
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 6, 'three files per client should still be visible internally');
  });
});
