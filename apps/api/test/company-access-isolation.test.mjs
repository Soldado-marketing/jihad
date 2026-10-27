/**
 * MAOS multi-company authorization: real Nest HTTP + isolated test database.
 * Run with MAOS_INTEGRATION=1, DATABASE_URL and JWT_SECRET, after migrations.
 * Requires a TEST database only; never point this suite at production.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { before, after, describe, it } from 'node:test';

const require = createRequire(import.meta.url);
const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const skip = process.env.MAOS_INTEGRATION !== '1' || !existsSync(join(apiRoot, 'dist/app.module.js'));
const RUN = 'co' + Date.now().toString(36);
const PASSWORD = 'CompanyAccessTest123!';

let app, server, request, prisma;
const companies = {};
const users = {};

async function seed(tenant, role, email, existingUserId) {
  const bcrypt = require('bcrypt');
  const user = existingUserId
    ? await prisma.user.findUnique({ where: { id: existingUserId } })
    : await prisma.user.create({
      data: { email, displayName: role + ' ' + RUN, passwordHash: await bcrypt.hash(PASSWORD, 10), status: 'APPROVED' },
    });
  const membership = await prisma.tenantMembership.create({
    data: { tenantId: tenant.id, userId: user.id, role, status: 'ACTIVE' },
  });
  return { id: user.id, email: user.email, membershipId: membership.id };
}
async function login(person, slug) {
  const res = await request(server).post('/api/auth/login').send({
    email: person.email, passwordOrMagicCode: PASSWORD, ...(slug ? { tenantSlug: slug } : {}),
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.tokens.accessToken;
}
const as = (token, req) => req.set('Authorization', 'Bearer ' + token);

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
  await app.listen(0, '127.0.0.1');
  server = app.getHttpServer();
  request = require('supertest');
  const { PrismaService } = require(join(apiRoot, 'dist/modules/prisma/prisma.service.js'));
  prisma = app.get(PrismaService);
  for (const letter of ['a', 'b', 'c']) {
    companies[letter] = await prisma.tenant.create({
      data: { name: 'Company ' + letter, slug: RUN + '-' + letter, status: 'ACTIVE' },
    });
    users['owner' + letter] = await seed(companies[letter], 'OWNER', 'owner' + letter + '-' + RUN + '@example.test');
  }
  users.manager = await seed(companies.a, 'MANAGER', 'manager-' + RUN + '@example.test');
  await seed(companies.b, 'MANAGER', '', users.manager.id);
  users.employee = await seed(companies.a, 'EMPLOYEE', 'employee-' + RUN + '@example.test');
  await seed(companies.b, 'EMPLOYEE', '', users.employee.id);
  users.client = await seed(companies.a, 'CLIENT', 'client-' + RUN + '@example.test');
  await seed(companies.b, 'CLIENT', '', users.client.id);
  users.ownerTokenA = await login(users.ownera, companies.a.slug);
  users.ownerTokenB = await login(users.ownerb, companies.b.slug);
  users.managerToken = await login(users.manager, companies.a.slug);
  users.employeeToken = await login(users.employee);
  users.clientToken = await login(users.client);
});
after(async () => { if (app) await app.close(); });

describe('Multi-company: active tenant memberships and explicit owner grants', { skip }, () => {
  it('rejects anonymous company enumeration', async () => {
    assert.equal((await request(server).get('/api/auth/companies')).status, 401);
  });
  it('OWNER/Manager see only authorized tenant memberships; never tenant C', async () => {
    for (const token of [users.managerToken, users.employeeToken]) {
      const res = await as(token, request(server).get('/api/auth/companies'));
      assert.equal(res.status, 200);
      assert.ok(!res.body.companies.some((c) => c.id === companies.c.id));
    }
    const list = await as(users.managerToken, request(server).get('/api/auth/companies'));
    assert.deepEqual(new Set(list.body.companies.map((c) => c.id)), new Set([companies.a.id, companies.b.id]));
  });
  it('EMPLOYEE sees only current company until explicit grants', async () => {
    const res = await as(users.employeeToken, request(server).get('/api/auth/companies'));
    assert.equal(res.status, 200);
    assert.equal(res.body.canSwitch, false);
    assert.deepEqual(res.body.companies.map((c) => c.id), [companies.a.id]);
    const denied = await as(users.employeeToken, request(server).post('/api/auth/companies/switch').send({ tenantId: companies.b.id }));
    assert.equal(denied.status, 403);
    const loginToOwnMembership = await request(server).post('/api/auth/login').send({
      email: users.employee.email, passwordOrMagicCode: PASSWORD, tenantSlug: companies.b.slug,
    });
    assert.equal(loginToOwnMembership.status, 200, 'password login may enter a company where the user has an active membership');
    const noForeignMembership = await request(server).post('/api/auth/login').send({
      email: users.employee.email, passwordOrMagicCode: PASSWORD, tenantSlug: companies.c.slug,
    });
    assert.equal(noForeignMembership.status, 403, 'unjoined company is never accessible by slug');
  });
  it('Owner can grant employee switching only in their own tenant', async () => {
    const outsider = await as(users.ownerTokenA, request(server)
      .patch('/api/auth/company-members/' + users.ownerb.id + '/switch').send({ enabled: true }));
    assert.equal(outsider.status, 403);
    const managerDenied = await as(users.managerToken, request(server)
      .patch('/api/auth/company-members/' + users.employee.id + '/switch').send({ enabled: true }));
    assert.equal(managerDenied.status, 403);
    const grantA = await as(users.ownerTokenA, request(server)
      .patch('/api/auth/company-members/' + users.employee.id + '/switch').send({ enabled: true }));
    assert.equal(grantA.status, 200, JSON.stringify(grantA.body));
    const onlyA = await as(users.employeeToken, request(server).get('/api/auth/companies'));
    assert.equal(onlyA.body.canSwitch, false);
    const grantB = await as(users.ownerTokenB, request(server)
      .patch('/api/auth/company-members/' + users.employee.id + '/switch').send({ enabled: true }));
    assert.equal(grantB.status, 200, JSON.stringify(grantB.body));
    const both = await as(users.employeeToken, request(server).get('/api/auth/companies'));
    assert.equal(both.body.canSwitch, true);
    assert.equal(both.body.companies.length, 2);
  });
  it('Company switch atomically rotates tokens, changes role scope, and revokes previous JWT', async () => {
    const res = await as(users.employeeToken, request(server)
      .post('/api/auth/companies/switch').send({ tenantId: companies.b.id }));
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.user.role, 'EMPLOYEE');
    assert.equal(res.body.tenant.id, companies.b.id);
    const old = await as(users.employeeToken, request(server).get('/api/auth/me'));
    assert.equal(old.status, 401);
    users.employeeTokenB = res.body.tokens.accessToken;
    const fresh = await as(users.employeeTokenB, request(server).get('/api/auth/me'));
    assert.equal(fresh.status, 200);
    assert.equal(fresh.body.tenantId, companies.b.id);
    const forged = await as(users.employeeTokenB, request(server)
      .post('/api/auth/companies/switch').send({ tenantId: companies.c.id }));
    assert.equal(forged.status, 403);
  });
  it('Revocation from company B immediately prevents further switching', async () => {
    const rev = await as(users.ownerTokenB, request(server)
      .patch('/api/auth/company-members/' + users.employee.id + '/switch').send({ enabled: false }));
    assert.equal(rev.status, 200);
    const list = await as(users.employeeTokenB, request(server).get('/api/auth/companies'));
    assert.equal(list.status, 200);
    assert.equal(list.body.canSwitch, false);
    assert.equal(list.body.companies.length, 1);
    const back = await as(users.employeeTokenB, request(server)
      .post('/api/auth/companies/switch').send({ tenantId: companies.a.id }));
    assert.equal(back.status, 403);
  });
  it('CLIENT without grants sees no company picker candidates beyond current', async () => {
    const res = await as(users.clientToken, request(server).get('/api/auth/companies'));
    assert.equal(res.status, 200);
    assert.equal(res.body.canSwitch, false);
    assert.equal(res.body.companies.length, 1);
  });
  it('Suspended tenant is never a switch target', async () => {
    await prisma.tenant.update({ where: { id: companies.b.id }, data: { status: 'SUSPENDED' } });
    const res = await as(users.managerToken, request(server)
      .post('/api/auth/companies/switch').send({ tenantId: companies.b.id }));
    assert.equal(res.status, 403);
  });
  it('Role changes take effect on the same JWT without preserving a stale elevated role', async () => {
    await prisma.tenantMembership.update({
      where: { tenantId_userId: { tenantId: companies.a.id, userId: users.manager.id } },
      data: { role: 'CONTRACTOR' },
    });
    const res = await as(users.managerToken, request(server).get('/api/auth/me'));
    assert.equal(res.status, 200);
    assert.equal(res.body.role, 'CONTRACTOR');
  });
});
