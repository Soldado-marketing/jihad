/**
 * TimeEntry + Rate schema (MAOS-T71, ADR-018). MIGRATION-GATED: runs only
 * against a database migrated with this branch.
 *
 * Proves the invariants the database itself enforces, independent of any API:
 * minutes 1-1440, non-negative cents, a frozen rate is complete or absent
 * ("unrated"), the rate scope shape, tenant cascade, and that a project or
 * member with logged time cannot be deleted while a tenant delete still works.
 *
 * Prerequisites (otherwise the whole suite skips rather than failing):
 *   npx prisma generate with this schema; migrated PostgreSQL; DATABASE_URL; MAOS_INTEGRATION=1.
 */

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { after, before, describe, it } from 'node:test';

const require = createRequire(import.meta.url);
const enabled = process.env.MAOS_INTEGRATION === '1' && Boolean(process.env.DATABASE_URL);
let prisma;
let ready = false;
const RUN = `te${Date.now().toString(36)}`;
const ids = {};

before(async () => {
  if (!enabled) return;
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
  ready = Boolean(prisma.timeEntry && prisma.rate);
  if (!ready) return;
  const tenant = await prisma.tenant.create({ data: { name: `T ${RUN}`, slug: `t-${RUN}`, status: 'ACTIVE' } });
  const user = await prisma.user.create({ data: { email: `m-${RUN}@example.test`, displayName: 'M', status: 'APPROVED' } });
  const project = await prisma.project.create({ data: { tenantId: tenant.id, name: `P ${RUN}` } });
  Object.assign(ids, { tenant: tenant.id, user: user.id, project: project.id });
});

after(async () => {
  if (prisma) await prisma.$disconnect();
});

const skip = !enabled ? 'set MAOS_INTEGRATION=1 and DATABASE_URL' : false;
const entry = (over = {}) => ({ tenantId: ids.tenant, userId: ids.user, projectId: ids.project, date: new Date('2026-10-16'), minutes: 30, ...over });
const rejects = async (fn, constraint) => {
  await assert.rejects(fn, (e) => JSON.stringify(e.meta ?? {}).includes(constraint) || String(e.message).includes(constraint), constraint);
};

describe('TimeEntry / Rate schema (MAOS-T71)', { skip }, () => {
  it('stores an unrated entry and a fully frozen one; defaults are DRAFT and billable', async () => {
    assert.ok(ready, 'Prisma client generated with the T71 schema');
    const unrated = await prisma.timeEntry.create({ data: entry() });
    assert.deepEqual([unrated.status, unrated.billable, unrated.rateCents, unrated.costCents], ['DRAFT', true, null, null]);
    const rated = await prisma.timeEntry.create({ data: entry({ minutes: 7, rateCents: 1999, rateSource: 'MEMBER', currency: 'EUR', costCents: 233 }) });
    assert.equal(rated.costCents, 233);
    assert.equal(rated.date.toISOString(), '2026-10-16T00:00:00.000Z', 'a calendar date, no time part');
  });

  it('refuses minutes outside 1-1440 and negative cents', async () => {
    for (const minutes of [0, -5, 1441]) await rejects(() => prisma.timeEntry.create({ data: entry({ minutes }) }), 'TimeEntry_minutes_check');
    await prisma.timeEntry.create({ data: entry({ minutes: 1440 }) });
    await rejects(() => prisma.timeEntry.create({ data: entry({ rateCents: -1, rateSource: 'TENANT', currency: 'EUR', costCents: 0 }) }), 'TimeEntry_cents_check');
  });

  it('refuses a half-frozen rate (rate without cost, cost without rate, missing source or currency)', async () => {
    const bad = [
      { rateCents: 3000 },
      { costCents: 50 },
      { rateCents: 3000, costCents: 50, currency: 'EUR' },
      { rateCents: 3000, costCents: 50, rateSource: 'ROLE' },
    ];
    for (const b of bad) await rejects(() => prisma.timeEntry.create({ data: entry(b) }), 'TimeEntry_frozen_rate_check');
  });

  it('enforces the rate scope shape and non-negative rates', async () => {
    const r = (over) => prisma.rate.create({ data: { tenantId: ids.tenant, rateCents: 6000, validFrom: new Date('2026-01-01'), ...over } });
    await r({ scope: 'MEMBER', userId: ids.user });
    await r({ scope: 'ROLE', role: 'EMPLOYEE' });
    await r({ scope: 'TENANT' });
    for (const bad of [
      { scope: 'MEMBER' },
      { scope: 'MEMBER', userId: ids.user, role: 'EMPLOYEE' },
      { scope: 'ROLE' },
      { scope: 'ROLE', role: 'CLIENT' },
      { scope: 'ROLE', role: 'EMPLOYEE', userId: ids.user },
      { scope: 'TENANT', role: 'OWNER' },
    ]) await rejects(() => r(bad), 'Rate_scope_check');
    await rejects(() => r({ scope: 'TENANT', rateCents: -1 }), 'Rate_rateCents_check');
    const rate = await prisma.rate.findFirst({ where: { tenantId: ids.tenant, scope: 'TENANT' } });
    assert.equal(rate.currency, 'EUR');
  });

  it('keeps logged time: a project or member with entries cannot be deleted', async () => {
    await assert.rejects(() => prisma.project.delete({ where: { id: ids.project } }));
    await assert.rejects(() => prisma.user.delete({ where: { id: ids.user } }));
    assert.ok(await prisma.project.findUnique({ where: { id: ids.project } }));
  });

  it('a deleted task detaches its entries (task id cleared, entry kept)', async () => {
    const task = await prisma.task.create({ data: { tenantId: ids.tenant, projectId: ids.project, title: `Task ${RUN}` } });
    const e = await prisma.timeEntry.create({ data: entry({ taskId: task.id }) });
    await prisma.task.delete({ where: { id: task.id } });
    assert.equal((await prisma.timeEntry.findUnique({ where: { id: e.id } })).taskId, null);
  });

  it('deleting the tenant removes its entries and rates in the same statement', async () => {
    await prisma.tenant.delete({ where: { id: ids.tenant } });
    assert.equal(await prisma.timeEntry.count({ where: { tenantId: ids.tenant } }), 0);
    assert.equal(await prisma.rate.count({ where: { tenantId: ids.tenant } }), 0);
    await prisma.user.delete({ where: { id: ids.user } });
  });
});
