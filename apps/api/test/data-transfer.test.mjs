/**
 * CSV import/export (MAOS-T118): /api/data/export/:type and /api/data/import/:type.
 *
 * Over HTTP against a real database:
 *   - export only for readers of the type, rows in the caller's tenant and
 *     work scope, e-mail columns only with MEMBERSHIP read, budget only for
 *     the OWNER, spreadsheet formulas neutralised;
 *   - import only for creators of the type; the whole file is validated and
 *     a single bad row rejects it with a report (200, valid=false) and
 *     writes nothing; a committed file answers 201; a file
 *     never names an id, so references resolve in the caller's tenant only;
 *   - duplicates (existing or in-file) are errors; a failure during the
 *     write rolls the whole file back;
 *   - size, row and CSV-format limits fail safely.
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
const built = existsSync(join(apiRoot, 'dist/modules/import-export/import-export.module.js'));
const configured = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET);
const skip = !enabled
  ? 'set MAOS_INTEGRATION=1 to run'
  : !built
    ? 'run `npm run build` first'
    : !configured
      ? 'DATABASE_URL and JWT_SECRET must be set'
      : false;

const RUN = `dt${Date.now().toString(36)}`;
const PASSWORD = 'TransferPass123!';

let app;
let server;
let request;
let prisma;
const t = {};
const people = {};
const d = {};

const exp = (who, type) => request(server).get(`/api/data/export/${type}`).set('Authorization', `Bearer ${people[who].token}`);
const imp = (who, type, csv, commit = false) =>
  request(server).post(`/api/data/import/${type}`).set('Authorization', `Bearer ${people[who].token}`).send({ csv, commit });
const lines = (res) => res.text.trim().split('\r\n');
const codes = (res) => res.body.errors.map((e) => `${e.line}:${e.column ?? ''}:${e.code}`);
const A = () => t.a.id;

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

  const hash = await require('bcrypt').hash(PASSWORD, 10);
  for (const name of ['a', 'b']) {
    t[name] = await prisma.tenant.create({ data: { name: `T${name} ${RUN}`, slug: `t${name}-${RUN}`, status: 'ACTIVE' }, select: { id: true } });
  }
  async function member(tenant, label, role, clientScopeKey) {
    const email = `${label}-${RUN}@example.test`;
    const user = await prisma.user.create({ data: { email, displayName: `${label} ${RUN}`, passwordHash: hash, status: 'APPROVED' }, select: { id: true } });
    await prisma.tenantMembership.create({
      data: { tenantId: t[tenant].id, userId: user.id, role, status: 'ACTIVE', visibilityScope: 'TENANT_WIDE', clientScopeKey },
    });
    const res = await request(server).post('/api/auth/login').send({ email, passwordOrMagicCode: PASSWORD, tenantSlug: `t${tenant}-${RUN}` });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return { id: user.id, email, token: res.body.tokens.accessToken };
  }
  people.owner = await member('a', 'owner', 'OWNER');
  people.manager = await member('a', 'manager', 'MANAGER');
  people.employee = await member('a', 'employee', 'EMPLOYEE');
  people.contractor = await member('a', 'contractor', 'CONTRACTOR');
  people.client = await member('a', 'client', 'CLIENT', `acme-${RUN}`);
  people.foreign = await member('b', 'foreign', 'OWNER');

  d.acme = await prisma.customer.create({ data: { tenantId: A(), clientScopeKey: `acme-${RUN}`, name: '=HYPERLINK("http://evil")', responsibleUserId: people.manager.id }, select: { id: true } });
  await prisma.customer.create({ data: { tenantId: A(), clientScopeKey: `old-${RUN}`, name: 'Old', status: 'ARCHIVED' } });
  await prisma.customer.create({ data: { tenantId: t.b.id, clientScopeKey: `bkey-${RUN}`, name: 'Foreign customer' } });
  d.member = await prisma.project.create({
    data: { tenantId: A(), name: `Member ${RUN}`, projectNumber: 'P-0007', customerId: d.acme.id, clientScopeKey: `acme-${RUN}`, budgetCents: 123456, ownerUserId: people.manager.id },
    select: { id: true },
  });
  d.other = await prisma.project.create({ data: { tenantId: A(), name: `Other ${RUN}`, projectNumber: `X-${RUN}` }, select: { id: true } });
  await prisma.project.create({ data: { tenantId: t.b.id, name: `Foreign ${RUN}`, projectNumber: `FB-${RUN}`, budgetCents: 999 } });
  await prisma.projectMember.create({ data: { tenantId: A(), projectId: d.member.id, userId: people.contractor.id, role: 'CONTRACTOR' } });
  await prisma.task.create({ data: { tenantId: A(), projectId: d.member.id, title: `Member task ${RUN}` } });
  await prisma.task.create({ data: { tenantId: A(), projectId: d.other.id, title: `Hidden task ${RUN}` } });
  // A project already carrying a key that has no customer yet (linked by a customer import).
  d.waiting = await prisma.project.create({ data: { tenantId: A(), name: `Waiting ${RUN}`, clientScopeKey: `newco-${RUN}` }, select: { id: true } });
});

after(async () => {
  if (app) await app.close();
});

describe('CSV export (MAOS-T118)', { skip }, () => {
  it('OWNER: projects with budget and e-mail columns, as a CSV download, formulas neutralised', async () => {
    const res = await exp('owner', 'projects');
    assert.equal(res.status, 200, res.text);
    assert.match(res.headers['content-type'], /^text\/csv/);
    assert.match(res.headers['content-disposition'], /^attachment; filename="maos-projects-\d{4}-\d{2}-\d{2}\.csv"$/);
    const [header, ...rows] = lines(res);
    assert.equal(header, 'projectNumber,name,status,customerKey,customerName,serviceType,deadline,description,ownerName,ownerEmail,budgetCents');
    const member = rows.find((r) => r.startsWith('P-0007,'));
    assert.ok(member.endsWith(`,${people.manager.email},123456`), member);
    assert.ok(member.includes(`"'=HYPERLINK(""http://evil"")"`), 'customer name is formula-neutralised');
    assert.ok(!res.text.includes(`FB-${RUN}`), 'no other tenant rows');
  });

  it('MANAGER: no budget and no e-mail columns or values', async () => {
    const res = await exp('manager', 'projects');
    assert.equal(res.status, 200);
    assert.equal(lines(res)[0], 'projectNumber,name,status,customerKey,customerName,serviceType,deadline,description,ownerName');
    assert.ok(!res.text.includes('123456') && !res.text.includes(people.manager.email));
  });

  it('EMPLOYEE reads customers and tasks without e-mail columns', async () => {
    const c = await exp('employee', 'customers');
    assert.equal(c.status, 200);
    assert.equal(lines(c)[0], 'name,clientScopeKey,status,industry,website,notes,responsibleName');
    assert.ok(!c.text.includes(people.manager.email));
    assert.equal((await exp('employee', 'tasks')).status, 200);
  });

  it('CONTRACTOR exports only assigned work and no customers', async () => {
    const res = await exp('contractor', 'tasks');
    assert.equal(res.status, 200);
    assert.ok(res.text.includes(`Member task ${RUN}`));
    assert.ok(!res.text.includes(`Hidden task ${RUN}`));
    const p = await exp('contractor', 'projects');
    assert.ok(p.text.includes(`Member ${RUN}`) && !p.text.includes(`Other ${RUN}`));
    assert.equal((await exp('contractor', 'customers')).status, 403);
  });

  it('CLIENT is refused; unknown type 400; no session 401', async () => {
    for (const type of ['customers', 'projects', 'tasks']) assert.equal((await exp('client', type)).status, 403, type);
    assert.equal((await exp('owner', 'users')).status, 400);
    assert.equal((await request(server).get('/api/data/export/projects')).status, 401);
  });

  it('records an audit event for the export', async () => {
    const ev = await prisma.auditEvent.findFirst({ where: { tenantId: A(), action: 'export.projects', actorId: people.owner.id } });
    assert.ok(ev);
  });
});

describe('CSV import (MAOS-T118)', { skip }, () => {
  it('validates without writing unless commit is true', async () => {
    const csv = `name,clientScopeKey,industry\nNew Co,newco-${RUN},Retail\n`;
    const dry = await imp('manager', 'customers', csv);
    assert.equal(dry.status, 200, JSON.stringify(dry.body));
    assert.deepEqual([dry.body.valid, dry.body.committed, dry.body.created, dry.body.rows], [true, false, 0, 1]);
    assert.equal(await prisma.customer.count({ where: { tenantId: A(), clientScopeKey: `newco-${RUN}` } }), 0);

    const real = await imp('manager', 'customers', csv, true);
    assert.equal(real.status, 201, JSON.stringify(real.body));
    assert.equal(real.body.created, 1);
    const c = await prisma.customer.findUnique({ where: { tenantId_clientScopeKey: { tenantId: A(), clientScopeKey: `newco-${RUN}` } } });
    assert.equal(c.industry, 'Retail');
    assert.equal((await prisma.project.findUnique({ where: { id: d.waiting.id } })).customerId, c.id, 'rows with the key are linked (ADR-017)');
    const ev = await prisma.auditEvent.findFirst({ where: { tenantId: A(), action: 'import.customers' } });
    assert.equal(ev.redactedPayload.created, 1);
  });

  it('reports every bad row and writes nothing when any row is invalid', async () => {
    const before = await prisma.customer.count({ where: { tenantId: A() } });
    const csv = [
      'name,clientScopeKey,status,website',
      `Fine,fine-${RUN},ACTIVE,https://ok.example`,
      `Dup,acme-${RUN},,`,
      `Twice,twice-${RUN},,`,
      `Twice again,twice-${RUN},,`,
      'Bad key,has space,,',
      `Archived,arch-${RUN},ARCHIVED,`,
      `Bad site,site-${RUN},,javascript:alert(1)`,
      `,nameless-${RUN},,`,
    ].join('\n');
    const res = await imp('owner', 'customers', csv, true);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual([res.body.valid, res.body.committed, res.body.created], [false, false, 0]);
    assert.deepEqual(codes(res), [
      '3:clientScopeKey:DUPLICATE_EXISTING',
      '5:clientScopeKey:DUPLICATE_IN_FILE',
      '6:clientScopeKey:INVALID_VALUE',
      '7:status:INVALID_VALUE',
      '8:website:INVALID_VALUE',
      '9:name:REQUIRED',
    ]);
    assert.equal(await prisma.customer.count({ where: { tenantId: A() } }), before, 'nothing written, not even the valid row');
  });

  it('refuses columns the caller may not import, unknown and missing columns', async () => {
    const budget = await imp('manager', 'projects', 'name,budgetCents\nX project,100\n');
    assert.equal(budget.status, 200);
    assert.deepEqual(codes(budget), ['1:budgetCents:COLUMN_NOT_ALLOWED']);
    assert.deepEqual(codes(await imp('manager', 'projects', 'name,ownerEmail\nX project,\n')), ['1:ownerEmail:COLUMN_NOT_ALLOWED']);
    assert.deepEqual(codes(await imp('owner', 'projects', 'name,id\nX project,abc\n')), ['1:id:UNKNOWN_COLUMN']);
    assert.deepEqual(codes(await imp('owner', 'tasks', 'status\nTODO\n')), ['1:title:MISSING_COLUMN']);
    assert.deepEqual(codes(await imp('owner', 'tasks', 'title,title\na,b\n')), ['1:title:DUPLICATE_COLUMN']);
  });

  it('never resolves references in another tenant and never coerces values', async () => {
    const csv = [
      'projectNumber,name,customerKey,deadline,budgetCents,ownerEmail,status',
      `,Cross tenant,bkey-${RUN},,,,`,
      `,Archived customer,old-${RUN},,,,`,
      ',Bad date,,2026-02-30,,,',
      ',Float money,,,1250.00,,',
      `,Foreign owner,,,,${people.foreign.email},`,
      `,Client owner,,,,${people.client.email},`,
      ',Bad status,,,,,DONE',
      'P-0007,Taken number,,,,,',
      `FB-${RUN},Foreign number is free here,,,,,`,
    ].join('\n');
    const res = await imp('owner', 'projects', csv, true);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(codes(res), [
      '2:customerKey:UNKNOWN_CUSTOMER',
      '3:customerKey:UNKNOWN_CUSTOMER',
      '4:deadline:INVALID_DATE',
      '5:budgetCents:INVALID_VALUE',
      '6:ownerEmail:NOT_A_MEMBER',
      '7:ownerEmail:NOT_A_MEMBER',
      '8:status:INVALID_VALUE',
      '9:projectNumber:DUPLICATE_EXISTING',
    ]);
  });

  it('OWNER creates projects: numbers continue, customer link derived, budget in cents', async () => {
    const csv = [
      'projectNumber,name,customerKey,deadline,budgetCents,ownerEmail',
      `,Auto one ${RUN},acme-${RUN},2026-12-24,500000,${people.employee.email.toUpperCase()}`,
      `P-0008,Explicit ${RUN},,,,`,
      `,Auto two ${RUN},,,,`,
    ].join('\n');
    const res = await imp('owner', 'projects', csv, true);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const rows = await prisma.project.findMany({ where: { tenantId: A(), name: { endsWith: RUN }, projectNumber: { in: ['P-0008', 'P-0009', 'P-0010'] } }, orderBy: { projectNumber: 'asc' } });
    assert.deepEqual(rows.map((p) => [p.projectNumber, p.name]), [['P-0008', `Explicit ${RUN}`], ['P-0009', `Auto one ${RUN}`], ['P-0010', `Auto two ${RUN}`]]);
    const one = rows[1];
    assert.deepEqual([one.customerId, one.clientScopeKey, one.budgetCents, one.ownerUserId], [d.acme.id, `acme-${RUN}`, 500000, people.employee.id]);
    assert.equal(one.deadline.toISOString(), '2026-12-24T00:00:00.000Z');
  });

  it('CONTRACTOR may add tasks only to member projects and may not set assignees', async () => {
    const refused = await imp('contractor', 'tasks', `title,projectNumber\nMine,P-0007\nNot mine,X-${RUN}\nForeign,FB-${RUN}\n`, true);
    assert.equal(refused.status, 200);
    assert.deepEqual(codes(refused), ['3:projectNumber:PROJECT_NOT_ASSIGNED', '4:projectNumber:UNKNOWN_PROJECT']);
    assert.deepEqual(codes(await imp('contractor', 'tasks', 'title,assigneeEmail\nx task,\n')), ['1:assigneeEmail:COLUMN_NOT_ALLOWED']);
    const ok = await imp('contractor', 'tasks', `title,projectNumber,status,priority,dueDate\nContractor import ${RUN},P-0007,IN_PROGRESS,HIGH,2026-11-01\n`, true);
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
    const task = await prisma.task.findFirst({ where: { tenantId: A(), title: `Contractor import ${RUN}` } });
    assert.deepEqual([task.projectId, task.status, task.priority, task.dueAt.toISOString().slice(0, 10)], [d.member.id, 'IN_PROGRESS', 'HIGH', '2026-11-01']);
  });

  it('CLIENT and roles without create are refused', async () => {
    assert.equal((await imp('client', 'tasks', 'title\nx task\n')).status, 403);
    assert.equal((await imp('employee', 'customers', 'name,clientScopeKey\nX,x-key\n')).status, 403);
    assert.equal((await imp('employee', 'projects', 'name\nX project\n')).status, 403);
    assert.equal((await imp('contractor', 'customers', 'name,clientScopeKey\nX,x-key\n')).status, 403);
  });

  it('fails safely on malformed CSV, empty files and the size and row limits', async () => {
    const quote = await imp('owner', 'tasks', 'title\n"never closed\n');
    assert.equal(quote.status, 200);
    assert.deepEqual(codes(quote), ['2::CSV_UNTERMINATED_QUOTE']);
    assert.deepEqual(codes(await imp('owner', 'tasks', 'title,status\nonly one\n')), ['2::CSV_COLUMN_COUNT']);
    assert.deepEqual(codes(await imp('owner', 'tasks', 'title\n')), ['1::NO_ROWS']);
    assert.deepEqual(codes(await imp('owner', 'tasks', 'title\n' + 'row task\n'.repeat(501))), ['502::CSV_TOO_MANY_ROWS']);
    assert.equal((await imp('owner', 'tasks', 'title\n' + 'x'.repeat(96_001))).status, 400, 'over the character limit');
    assert.equal((await request(server).post('/api/data/import/tasks').set('Authorization', `Bearer ${people.owner.token}`).send({ csv: 'title\nx\n', extra: 1 })).status, 400);
  });

  it('rolls the whole file back when a write fails, and answers 409 on a unique clash', async () => {
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION maos_test_${RUN}() RETURNS trigger AS $$
      BEGIN
        IF NEW.name = 'BOOM ${RUN}' THEN RAISE EXCEPTION 'test failure'; END IF;
        IF NEW.name = 'CLASH ${RUN}' THEN RAISE EXCEPTION 'clash' USING ERRCODE = 'unique_violation'; END IF;
        RETURN NEW;
      END $$ LANGUAGE plpgsql`);
    await prisma.$executeRawUnsafe(`CREATE TRIGGER maos_test_${RUN} BEFORE INSERT ON "Customer" FOR EACH ROW EXECUTE FUNCTION maos_test_${RUN}()`);
    try {
      const before = await prisma.customer.count({ where: { tenantId: A() } });
      const boom = await imp('owner', 'customers', `name,clientScopeKey\nFirst ${RUN},first-${RUN}\nBOOM ${RUN},boom-${RUN}\n`, true);
      assert.equal(boom.status, 500);
      const clash = await imp('owner', 'customers', `name,clientScopeKey\nFirst ${RUN},first-${RUN}\nCLASH ${RUN},clash-${RUN}\n`, true);
      assert.equal(clash.status, 409, JSON.stringify(clash.body));
      assert.ok(JSON.stringify(clash.body).includes('IMPORT_CONFLICT'), JSON.stringify(clash.body));
      assert.equal(await prisma.customer.count({ where: { tenantId: A() } }), before, 'the first row was rolled back both times');
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS maos_test_${RUN} ON "Customer"`);
      await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS maos_test_${RUN}()`);
    }
  });

  it('another tenant sees none of it', async () => {
    const res = await exp('foreign', 'projects');
    assert.equal(res.status, 200);
    const [, ...rows] = lines(res);
    assert.deepEqual(rows.map((r) => r.split(',')[0]), [`FB-${RUN}`], 'only its own project');
    for (const name of [`Member ${RUN}`, `Other ${RUN}`, `Auto one ${RUN}`]) assert.ok(!res.text.includes(name));
  });
});
