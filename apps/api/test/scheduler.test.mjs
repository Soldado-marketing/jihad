/**
 * In-process scheduler (MAOS D8) and the invite-expiry job.
 *
 * Off unless MAOS_SCHEDULER_ENABLED=true. Each run takes a Postgres advisory
 * lock inside its transaction, so a second instance skips; a job never
 * overlaps itself; a failing job rolls back and does not stop the others.
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

const RUN = `sc${Date.now().toString(36)}`;
const HOUR = 3600 * 1000;

let app;
let prisma;
let scheduler;
let SchedulerService;
let LOCK_NAMESPACE;
let tenantId = '';
let seq = 0;

async function invite(status, expiresInMs) {
  seq += 1;
  return prisma.invite.create({
    data: {
      tenantId,
      email: `sched${seq}-${RUN}@example.test`,
      role: 'EMPLOYEE',
      status,
      tokenHash: `${RUN}-${seq}`.padEnd(64, '0'),
      expiresAt: new Date(Date.now() + expiresInMs),
    },
    select: { id: true },
  });
}
const statusOf = async (id) => (await prisma.invite.findUnique({ where: { id } })).status;

before(async () => {
  if (skip) return;
  delete process.env.MAOS_SCHEDULER_ENABLED;
  require('reflect-metadata');
  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = require(join(apiRoot, 'dist/app.module.js'));
  app = await NestFactory.create(AppModule, { logger: false });
  await app.init();
  const { PrismaService } = require(join(apiRoot, 'dist/modules/prisma/prisma.service.js'));
  ({ SchedulerService, LOCK_NAMESPACE } = require(join(apiRoot, 'dist/modules/scheduler/scheduler.service.js')));
  prisma = app.get(PrismaService);
  scheduler = app.get(SchedulerService);
  const tenant = await prisma.tenant.create({ data: { name: `Tenant ${RUN}`, slug: `tenant-${RUN}`, status: 'ACTIVE' }, select: { id: true } });
  tenantId = tenant.id;
});

after(async () => {
  if (app) await app.close();
});

describe('scheduler (MAOS D8)', { skip }, () => {
  it('is off by default: the app boots with no timers', () => {
    assert.equal(scheduler.activeTimers, 0);
    assert.deepEqual(scheduler.status().map((s) => s.name), ['invite-expiry']);
  });

  it('starts one timer per job only when MAOS_SCHEDULER_ENABLED=true, and stops them on shutdown', () => {
    const job = { name: 'noop', everyMs: 24 * HOUR, lockKey: 900, run: async () => 0 };
    process.env.MAOS_SCHEDULER_ENABLED = 'TRUE';
    const loose = new SchedulerService(prisma, [job]);
    loose.onApplicationBootstrap();
    assert.equal(loose.activeTimers, 0, 'only the exact value "true" enables it');
    process.env.MAOS_SCHEDULER_ENABLED = 'true';
    try {
      const s = new SchedulerService(prisma, [job, { ...job, name: 'noop2', lockKey: 901 }]);
      s.onApplicationBootstrap();
      assert.equal(s.activeTimers, 2);
      s.onModuleDestroy();
      assert.equal(s.activeTimers, 0);
    } finally {
      delete process.env.MAOS_SCHEDULER_ENABLED;
    }
  });

  it('invite-expiry marks only open, past-due invites EXPIRED, and a second run changes nothing', async () => {
    const pastOpen = await invite('SENT', -HOUR);
    const futureOpen = await invite('SENT', HOUR);
    const pastAccepted = await invite('ACCEPTED', -HOUR);
    const pastRevoked = await invite('REVOKED', -HOUR);

    const first = await scheduler.runNow('invite-expiry');
    assert.equal(first.outcome, 'succeeded');
    assert.ok(first.affected >= 1);
    assert.equal(await statusOf(pastOpen.id), 'EXPIRED');
    assert.equal(await statusOf(futureOpen.id), 'SENT');
    assert.equal(await statusOf(pastAccepted.id), 'ACCEPTED');
    assert.equal(await statusOf(pastRevoked.id), 'REVOKED');

    const second = await scheduler.runNow('invite-expiry');
    assert.deepEqual([second.outcome, second.affected], ['succeeded', 0]);
  });

  it('skips the round when another instance holds the job lock', async () => {
    const pastOpen = await invite('SENT', -HOUR);
    let outcome;
    await prisma.$transaction(async (tx) => {
      // What another API instance running the same job holds.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_NAMESPACE}::int, 1::int)`;
      outcome = await scheduler.runNow('invite-expiry');
    });
    assert.equal(outcome.outcome, 'skipped_locked');
    assert.equal(await statusOf(pastOpen.id), 'SENT', 'nothing written while skipped');
    assert.equal((await scheduler.runNow('invite-expiry')).outcome, 'succeeded');
    assert.equal(await statusOf(pastOpen.id), 'EXPIRED');
  });

  it('never runs a job twice at once on one instance', async () => {
    const pastOpen = await invite('SENT', -HOUR);
    let first;
    let second;
    await prisma.$transaction(
      async (tx) => {
        // Hold the row the job must update, so the first run waits inside it.
        await tx.$executeRaw`SELECT 1 FROM "Invite" WHERE id = ${pastOpen.id} FOR UPDATE`;
        first = scheduler.runNow('invite-expiry');
        for (let i = 0; i < 100; i += 1) {
          const [{ waiting }] = await prisma.$queryRaw`SELECT count(*)::int AS waiting FROM pg_locks WHERE NOT granted`;
          if (waiting > 0) break;
          await new Promise((r) => setTimeout(r, 50));
        }
        second = await scheduler.runNow('invite-expiry');
      },
      { timeout: 15000 },
    );
    assert.equal(second.outcome, 'skipped_running');
    assert.equal((await first).outcome, 'succeeded');
    assert.equal(await statusOf(pastOpen.id), 'EXPIRED');
  });

  it('a failing job rolls back, is counted, and does not stop the other jobs', async () => {
    const victim = await invite('SENT', HOUR);
    const failing = {
      name: 'failing',
      everyMs: HOUR,
      lockKey: 902,
      async run(tx) {
        await tx.invite.update({ where: { id: victim.id }, data: { status: 'REVOKED' } });
        throw new TypeError(`boom with data ${victim.id}`);
      },
    };
    const ok = { name: 'ok', everyMs: HOUR, lockKey: 903, run: async () => 7 };
    const s = new SchedulerService(prisma, [failing, ok]);

    const failed = await s.runNow('failing');
    assert.equal(failed.outcome, 'failed');
    assert.equal(failed.error, 'TypeError', 'only the error class, never its text');
    assert.equal(await statusOf(victim.id), 'SENT', 'rolled back');
    assert.deepEqual((await s.runNow('ok')).affected, 7);
    assert.equal((await s.runNow('failing')).outcome, 'failed', 'still runnable next round');
    const byName = Object.fromEntries(s.status().map((x) => [x.name, x]));
    assert.deepEqual([byName.failing.runs, byName.failing.failures, byName.failing.lastOutcome], [2, 2, 'failed']);
    assert.deepEqual([byName.ok.runs, byName.ok.failures, byName.ok.lastOutcome], [1, 0, 'succeeded']);
    await assert.rejects(s.runNow('missing'), /Unknown job/);
  });
});
