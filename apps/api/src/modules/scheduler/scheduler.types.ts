import { Prisma } from '@prisma/client';

/**
 * One recurring background job (MAOS D8). `run` receives the transaction that
 * holds the job's advisory lock, so everything it writes commits or rolls back
 * together, and returns how many rows it changed (for the run log).
 */
export interface ScheduledJob {
  /** Stable name, used in logs. */
  readonly name: string;
  /** Interval between runs on this instance. */
  readonly everyMs: number;
  /** Unique per job: the second key of the Postgres advisory lock. */
  readonly lockKey: number;
  run(tx: Prisma.TransactionClient): Promise<number>;
}

export type RunOutcome =
  | { outcome: 'succeeded'; affected: number; durationMs: number }
  | { outcome: 'skipped_locked' }
  | { outcome: 'skipped_running' }
  | { outcome: 'failed'; error: string; durationMs: number };

export interface JobStatus {
  name: string;
  runs: number;
  failures: number;
  lastOutcome: RunOutcome['outcome'] | null;
  lastFinishedAt: string | null;
}

/** Injection token for the list of jobs. */
export const SCHEDULED_JOBS = Symbol('SCHEDULED_JOBS');
