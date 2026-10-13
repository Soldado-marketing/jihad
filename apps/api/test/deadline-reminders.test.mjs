/**
 * Deadline and approval reminders (MAOS-T142), run by the in-process
 * scheduler (D8). Reminders go through the single notification writer, so they
 * reach only ACTIVE members of the right tenant, never CLIENTs, and only once.
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

const RUN = `dr${Date.now().toString(36)}`;
const HOUR = 3600 * 1000;

let app;
let prisma;
let scheduler;
const t = {};
const u = {};

const at = (ms) => new Date(Date.now() + ms);
const remindersFor = (userId, resourceId) => prisma.notification.count({ where: { recipientUserId: userId, resourceId } });
const run = async () => {
  const r = await scheduler.runNow('deadline-reminders');
  assert.equal(r.outcome, 'succeeded', JSON.stringify(r));
  return r.affected;
};

before(async () => {
  if (skip) return;
  require('reflect-metadata');
  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = require(join(apiRoot, 'dist/app.module.js'));
  app = await NestFactory.create(AppModule, { logger: false });
  await app.init();
  const { PrismaService } = require(join(apiRoot, 'dist/modules/prisma/prisma.service.js'));
  const { SchedulerService } = require(join(apiRoot, 'dist/modules/scheduler/scheduler.service.js'));
  prisma = app.get(PrismaService);
  scheduler = app.get(SchedulerService);

  t.a = await prisma.tenant.create({ data: { name: `A ${RUN}`, slug: `a-${RUN}`, status: 'ACTIVE' } });
  t.s = await prisma.tenant.create({ data: { name: `S ${RUN}`, slug: `s-${RUN}`, status: 'SUSPENDED' } });
  async function member(tenant, label, role, status = 'ACTIVE') {
    const user = await prisma.user.create({ data: { email: `${label}-${RUN}@example.test`, displayName: label, status: 'APPROVED' } });
    await prisma.tenantMembership.create({
      data: { tenantId: t[tenant].id, userId: user.id, role, status, visibilityScope: 'TENANT_WIDE', clientScopeKey: role === 'CLIENT' ? `k-${RUN}` : null },
    });
    return user.id;
  }
  u.owner = await member('a', 'owner', 'OWNER');
  u.manager = await member('a', 'manager', 'MANAGER');
  u.employee = await member('a', 'employee', 'EMPLOYEE');
  u.client = await member('a', 'client', 'CLIENT');
  u.suspended = await member('a', 'suspended', 'EMPLOYEE', 'SUSPENDED');
  u.sOwner = await member('s', 'sowner', 'OWNER');
});

after(async () => {
  if (app) await app.close();
});

describe('deadline reminders (MAOS-T142)', { skip }, () => {
  const task = (title, extra) => prisma.task.create({ data: { tenantId: t.a.id, title, status: 'TODO', ...extra } });

  it('reminds the assignee of an open task due within 24 hours, once', async () => {
    const due = await task('due soon', { assignedToUserId: u.employee, dueAt: at(2 * HOUR) });
    const later = await task('due later', { assignedToUserId: u.employee, dueAt: at(30 * HOUR) });
    const overdue = await task('overdue', { assignedToUserId: u.employee, dueAt: at(-2 * HOUR) });
    const done = await task('done', { assignedToUserId: u.employee, dueAt: at(2 * HOUR), status: 'DONE' });
    const unassigned = await task('unassigned', { dueAt: at(2 * HOUR) });

    await run();
    assert.equal(await remindersFor(u.employee, due.id), 1);
    const n = await prisma.notification.findFirst({ where: { recipientUserId: u.employee, resourceId: due.id } });
    assert.deepEqual([n.tenantId, n.title, n.body, n.resourceType], [t.a.id, 'Task due within 24 hours', 'due soon', 'task']);
    for (const other of [later, overdue, done, unassigned]) {
      assert.equal(await prisma.notification.count({ where: { resourceId: other.id } }), 0, other.title);
    }

    assert.equal(await run(), 0, 'a second run sends nothing new');
    assert.equal(await remindersFor(u.employee, due.id), 1);

    // A moved deadline is a new occasion for a reminder.
    await prisma.task.update({ where: { id: due.id }, data: { dueAt: at(5 * HOUR) } });
    await run();
    assert.equal(await remindersFor(u.employee, due.id), 2);
  });

  it('never reminds a suspended member, a CLIENT, or anyone in a suspended tenant', async () => {
    const toSuspended = await task('suspended assignee', { assignedToUserId: u.suspended, dueAt: at(2 * HOUR) });
    const toClient = await task('client assignee', { assignedToUserId: u.client, dueAt: at(2 * HOUR) });
    const inSuspendedTenant = await prisma.task.create({
      data: { tenantId: t.s.id, title: 'other tenant', status: 'TODO', assignedToUserId: u.sOwner, dueAt: at(2 * HOUR) },
    });
    await run();
    for (const x of [toSuspended, toClient, inSuspendedTenant]) {
      assert.equal(await prisma.notification.count({ where: { resourceId: x.id } }), 0, x.title);
    }
  });

  it('reminds the deciders (OWNER, MANAGER) of a requested approval due within 24 hours, not its requester', async () => {
    const open = await prisma.approvalRequest.create({
      data: { tenantId: t.a.id, title: 'Homepage v2', status: 'REQUESTED', dueAt: at(3 * HOUR), requestedByUserId: u.manager },
    });
    const decided = await prisma.approvalRequest.create({
      data: { tenantId: t.a.id, title: 'Logo', status: 'APPROVED', dueAt: at(3 * HOUR), requestedByUserId: u.manager },
    });
    await run();
    assert.equal(await remindersFor(u.owner, open.id), 1);
    assert.equal(await remindersFor(u.manager, open.id), 0, 'the requester waits; it is not their decision');
    for (const who of ['employee', 'client', 'suspended']) assert.equal(await remindersFor(u[who], open.id), 0, who);
    assert.equal(await prisma.notification.count({ where: { resourceId: decided.id } }), 0);
    await run();
    assert.equal(await remindersFor(u.owner, open.id), 1, 'once');
  });

  it('an explicitly named suspended member no longer receives any notification', async () => {
    const { NotificationsService } = require(join(apiRoot, 'dist/modules/notifications/notifications.service.js'));
    const created = await app.get(NotificationsService).notify({
      tenantId: t.a.id,
      recipientUserIds: [u.suspended, u.employee],
      audience: 'INTERNAL',
      dedupeKey: `direct-${RUN}`,
      title: 'Direct',
    });
    assert.equal(created, 1);
    assert.equal(await prisma.notification.count({ where: { recipientUserId: u.suspended } }), 0);
  });
});
