import { Inject, Injectable, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { logStructured } from '../../common/logging/structured-logger';
import { PrismaService } from '../prisma/prisma.service';
import { JobStatus, RunOutcome, SCHEDULED_JOBS, ScheduledJob } from './scheduler.types';

/** First key of every MAOS advisory lock ("MAOS" as an int4), so job locks never collide with others. */
export const LOCK_NAMESPACE = 0x4d414f53;
const JOB_TIMEOUT_MS = 60_000;

/** Off unless MAOS_SCHEDULER_ENABLED is exactly "true". */
export function schedulerEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.MAOS_SCHEDULER_ENABLED === 'true';
}

/**
 * In-process scheduler (MAOS D8): the lowest-complexity option - no new
 * dependency, no worker service, no queue. Each job runs on an interval
 * inside one transaction that first takes a Postgres advisory lock, so with
 * several API instances a job still runs on only one of them at a time; an
 * instance that finds the lock taken skips that round. A job never overlaps
 * itself on one instance, and a failing job is logged and rolled back without
 * affecting the others.
 *
 * Run records are structured log lines (job, outcome, rows, duration, error
 * class - never the error text, which may carry data). Durable run records
 * need a table, which waits for a migration gate.
 */
@Injectable()
export class SchedulerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly timers: NodeJS.Timeout[] = [];
  private readonly running = new Set<string>();
  private readonly statuses = new Map<string, JobStatus>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SCHEDULED_JOBS) private readonly jobs: ScheduledJob[],
  ) {
    for (const job of jobs) {
      this.statuses.set(job.name, { name: job.name, runs: 0, failures: 0, lastOutcome: null, lastFinishedAt: null });
    }
  }

  onApplicationBootstrap(): void {
    if (!schedulerEnabled()) {
      logStructured('info', 'scheduler_disabled', { jobs: this.jobs.map((j) => j.name) });
      return;
    }
    for (const job of this.jobs) {
      const timer = setInterval(() => void this.runNow(job.name), job.everyMs);
      // Never keep the process alive just for the scheduler.
      timer.unref();
      this.timers.push(timer);
    }
    logStructured('info', 'scheduler_started', { jobs: this.jobs.map((j) => `${j.name}@${j.everyMs}ms`) });
  }

  onModuleDestroy(): void {
    for (const timer of this.timers.splice(0)) clearInterval(timer);
  }

  /** Number of active interval timers (0 when disabled or stopped). */
  get activeTimers(): number {
    return this.timers.length;
  }

  status(): JobStatus[] {
    return [...this.statuses.values()].map((s) => ({ ...s }));
  }

  async runNow(name: string): Promise<RunOutcome> {
    const job = this.jobs.find((j) => j.name === name);
    if (!job) throw new Error(`Unknown job: ${name}`);
    if (this.running.has(name)) return this.record(job, { outcome: 'skipped_running' });

    this.running.add(name);
    const started = Date.now();
    try {
      const affected = await this.prisma.$transaction(
        async (tx) => {
          const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>`
            SELECT pg_try_advisory_xact_lock(${LOCK_NAMESPACE}::int, ${job.lockKey}::int) AS locked`;
          return locked ? job.run(tx) : null;
        },
        { timeout: JOB_TIMEOUT_MS, maxWait: 10_000 },
      );
      if (affected === null) return this.record(job, { outcome: 'skipped_locked' });
      return this.record(job, { outcome: 'succeeded', affected, durationMs: Date.now() - started });
    } catch (err: unknown) {
      const error = err instanceof Error ? err.name : 'UnknownError';
      return this.record(job, { outcome: 'failed', error, durationMs: Date.now() - started });
    } finally {
      this.running.delete(name);
    }
  }

  private record(job: ScheduledJob, result: RunOutcome): RunOutcome {
    const s = this.statuses.get(job.name)!;
    s.runs += 1;
    if (result.outcome === 'failed') s.failures += 1;
    s.lastOutcome = result.outcome;
    s.lastFinishedAt = new Date().toISOString();
    logStructured(result.outcome === 'failed' ? 'error' : 'info', `scheduled_job_${result.outcome}`, {
      job: job.name,
      ...result,
    });
    return result;
  }
}
