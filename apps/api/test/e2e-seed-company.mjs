#!/usr/bin/env node
/**
 * Seeds a second, fictional company for the browser smoke (apps/web/e2e), the
 * way the API integration suites seed theirs: straight into the database,
 * because /auth/bootstrap creates only the very first company of an install.
 *
 * Creates: an ACTIVE company, its OWNER (random password, printed once as JSON
 * on stdout for the test run that asked for it), a customer, and one
 * client-visible project with one client-visible task. Nothing here is a real
 * person or company. Never run against a shared or production database.
 *
 *   DATABASE_URL=postgresql://... node test/e2e-seed-company.mjs
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const require = createRequire(import.meta.url);
const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const { PrismaClient } = require(join(apiRoot, 'node_modules/@prisma/client'));
const bcrypt = require(join(apiRoot, 'node_modules/bcrypt'));

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required (a disposable database).');
  process.exit(2);
}

const run = `${Date.now().toString(36)}${randomBytes(2).toString('hex')}`;
const prisma = new PrismaClient();
try {
  const password = randomBytes(18).toString('base64url');
  const tenant = await prisma.tenant.create({ data: { name: `E2E Other Agency ${run}`, slug: `e2e-other-${run}`, status: 'ACTIVE' } });
  const owner = await prisma.user.create({
    data: { email: `owner-other-${run}@example.test`, displayName: 'E2E Other Owner', passwordHash: await bcrypt.hash(password, 10), status: 'ACTIVE' },
  });
  await prisma.tenantMembership.create({ data: { tenantId: tenant.id, userId: owner.id, role: 'OWNER', status: 'ACTIVE' } });
  const customer = await prisma.customer.create({ data: { tenantId: tenant.id, name: `Other Customer ${run}`, clientScopeKey: `other-${run}` } });
  const project = await prisma.project.create({
    data: { tenantId: tenant.id, name: `Other Company Project ${run}`, status: 'ACTIVE', clientVisible: true, customerId: customer.id, clientScopeKey: customer.clientScopeKey },
  });
  await prisma.task.create({
    data: { tenantId: tenant.id, projectId: project.id, title: `Other company task ${run}`, status: 'TODO', clientVisible: true, clientScopeKey: customer.clientScopeKey },
  });
  process.stdout.write(JSON.stringify({ tenantSlug: tenant.slug, tenantName: tenant.name, owner: { email: owner.email, password, fullName: owner.displayName }, projectId: project.id, projectName: project.name }) + '\n');
} finally {
  await prisma.$disconnect();
}
