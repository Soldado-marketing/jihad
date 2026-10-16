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
    // 1 minute at 3000 cents/h is 50 cents, so only the complete-or-absent rule is under test.
    const bad = [
      { rateCents: 3000 },
      { costCents: 50 },
      { rateCents: 3000, costCents: 50, currency: 'EUR' },
      { rateCents: 3000, costCents: 50, rateSource: 'ROLE' },
    ];
    for (const b of bad) await rejects(() => prisma.timeEntry.create({ data: entry({ minutes: 1, ...b }) }), 'TimeEntry_frozen_rate_check');
  });

  it('enforces the rate scope shape and non-negative rates', async () => {
    const r = (over) => prisma.rate.create({ data: { tenantId: ids.tenant, rateCents: 6000, validFrom: new Date('2026-01-01'), ...over } });
    await r({ scope: 'MEMBER', userId: ids.user, scopeKey: `MEMBER:${ids.user}` });
    await r({ scope: 'ROLE', role: 'EMPLOYEE', scopeKey: 'ROLE:EMPLOYEE' });
    await r({ scope: 'TENANT', scopeKey: 'TENANT' });
    for (const bad of [
      { scope: 'MEMBER', scopeKey: 'MEMBER:' },
      { scope: 'MEMBER', userId: ids.user, role: 'EMPLOYEE', scopeKey: `MEMBER:${ids.user}` },
      { scope: 'ROLE', scopeKey: 'ROLE:' },
      { scope: 'ROLE', role: 'CLIENT', scopeKey: 'ROLE:CLIENT' },
      { scope: 'ROLE', role: 'EMPLOYEE', userId: ids.user, scopeKey: 'ROLE:EMPLOYEE' },
      { scope: 'TENANT', role: 'OWNER', scopeKey: 'TENANT' },
    ]) await rejects(() => r({ validFrom: new Date('2026-02-01'), ...bad }), 'Rate_scope_check');
    await rejects(() => r({ scope: 'TENANT', scopeKey: 'TENANT', rateCents: -1, validFrom: new Date('2026-03-01') }), 'Rate_rateCents_check');
    const rate = await prisma.rate.findFirst({ where: { tenantId: ids.tenant, scope: 'TENANT' } });
    assert.equal(rate.currency, 'EUR');
  });

  it('admits exactly one rate per workspace, scope target and day (audit finding 1)', async () => {
    const day = new Date('2026-06-01');
    const other = await prisma.user.create({ data: { email: `o-${RUN}@example.test`, displayName: 'O', status: 'APPROVED' } });
    const t2 = await prisma.tenant.create({ data: { name: `T2 ${RUN}`, slug: `t2-${RUN}`, status: 'ACTIVE' } });
    const r = (over) => prisma.rate.create({ data: { tenantId: ids.tenant, rateCents: 5000, validFrom: day, ...over } });
    const tenantRate = { scope: 'TENANT', scopeKey: 'TENANT' };
    const roleRate = { scope: 'ROLE', role: 'MANAGER', scopeKey: 'ROLE:MANAGER' };
    const memberRate = { scope: 'MEMBER', userId: ids.user, scopeKey: `MEMBER:${ids.user}` };
    for (const key of [tenantRate, roleRate, memberRate]) {
      await r(key);
      await rejects(() => r({ ...key, rateCents: 9000 }), 'scopeKey');
    }
    // Different day, role, member or workspace are separate keys.
    await r({ ...tenantRate, validFrom: new Date('2026-06-02') });
    await r({ scope: 'ROLE', role: 'EMPLOYEE', scopeKey: 'ROLE:EMPLOYEE' });
    await r({ scope: 'MEMBER', userId: other.id, scopeKey: `MEMBER:${other.id}` });
    await prisma.rate.create({ data: { tenantId: t2.id, rateCents: 1, validFrom: day, ...tenantRate } });
    assert.equal(await prisma.rate.count({ where: { tenantId: ids.tenant, validFrom: day } }), 5);
    await prisma.tenant.delete({ where: { id: t2.id } });
    // A member with a rate cannot be deleted (NO ACTION); remove the rate first.
    await assert.rejects(() => prisma.user.delete({ where: { id: other.id } }));
    await prisma.rate.deleteMany({ where: { userId: other.id } });
    await prisma.user.delete({ where: { id: other.id } });
  });

  it('refuses a scopeKey that does not name the rate target (so the key cannot be bypassed)', async () => {
    const r = (over) => prisma.rate.create({ data: { tenantId: ids.tenant, rateCents: 5000, validFrom: new Date('2026-07-01'), ...over } });
    for (const bad of [
      { scope: 'TENANT', scopeKey: 'TENANT2' },
      { scope: 'TENANT', scopeKey: 'ROLE:EMPLOYEE' },
      { scope: 'ROLE', role: 'EMPLOYEE', scopeKey: 'ROLE:MANAGER' },
      { scope: 'ROLE', role: 'EMPLOYEE', scopeKey: 'TENANT' },
      { scope: 'MEMBER', userId: ids.user, scopeKey: 'MEMBER:someone-else' },
      { scope: 'MEMBER', userId: ids.user, scopeKey: `member:${ids.user}` },
    ]) await rejects(() => r(bad), 'Rate_scope_key_check');
  });

  it('stores cost = round_half_up(minutes x rate / 60) and nothing else (audit finding 2)', async () => {
    const rated = (minutes, rateCents, costCents) =>
      prisma.timeEntry.create({ data: entry({ minutes, rateCents, costCents, rateSource: 'TENANT', currency: 'EUR' }) });
    for (const [m, rate, cost] of [
      [60, 3000, 3000],
      [1, 3000, 50],
      [7, 1999, 233], // 233.21
      [1, 30, 1], // 0.5 -> 1 (half up)
      [1, 29, 0], // 0.48 -> 0
      [1, 89, 1], // 1.48 -> 1
      [1, 90, 2], // 1.5 -> 2
      [59, 1, 1], // 0.983 -> 1
      [1440, 0, 0],
    ]) await rated(m, rate, cost);
    for (const [m, rate, cost] of [[60, 3000, 2999], [60, 3000, 3001], [60, 3000, 1], [1, 30, 0], [1, 90, 1]]) {
      await rejects(() => rated(m, rate, cost), 'TimeEntry_cost_formula_check');
    }
    // minutes x rate above the integer range (1440 x 2 000 000 = 2.88e9) is computed in bigint, not overflowed.
    const big = await rated(1440, 2_000_000, 48_000_000);
    assert.equal(big.costCents, 48_000_000);
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
