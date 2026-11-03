import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { OpsAlertsService, WatchdogFinding } from '../ops-alerts.service';
import { SchedulerService } from '../scheduler.service';
import { JobStatus, ScheduledJob } from '../scheduler.types';

export const WATCHDOG_NAME = 'ops-watchdog';
const SILENCE_FACTOR = 2;

/**
 * B06 — tells the owners when another scheduled job failed in its last round
 * or has not finished for twice its interval (silent). One notice per
 * failure (keyed by the failure time) and one per silent hour. Reads the
 * scheduler's in-process statuses; never touches job data.
 */
@Injectable()
export class OpsWatchdogJob implements ScheduledJob {
  readonly name = WATCHDOG_NAME;
  readonly everyMs = 15 * 60 * 1000;
  readonly lockKey = 5;
  private readonly bootedAt = Date.now();

  constructor(
    private readonly ops: OpsAlertsService,
    private readonly moduleRef: ModuleRef,
  ) {}

  /** `statuses` and `now` exist for tests; the scheduler's own statuses are used otherwise. */
  async run(_tx: Prisma.TransactionClient, now = new Date(), statuses?: JobStatus[]): Promise<number> {
    const list = statuses ?? this.moduleRef.get(SchedulerService, { strict: false }).status();
    const findings: WatchdogFinding[] = [];
    let created = 0;
    for (const s of list) {
      if (s.name === this.name) continue;
      if (s.lastOutcome === 'failed' && s.lastFinishedAt) {
        findings.push({ job: s.name, kind: 'failed', at: s.lastFinishedAt });
        created += await this.ops.notifyOwners(
          `ops.job_failed:${s.name}:${s.lastFinishedAt}`,
          'Scheduled job failed',
          `${s.name} failed at ${s.lastFinishedAt} (${s.failures} failure(s) since start). Check the API logs.`,
        );
      }
      const last = s.lastFinishedAt ? new Date(s.lastFinishedAt).getTime() : this.bootedAt;
      if (now.getTime() - last > SILENCE_FACTOR * s.everyMs) {
        const hour = now.toISOString().slice(0, 13);
        findings.push({ job: s.name, kind: 'silent', at: now.toISOString() });
        created += await this.ops.notifyOwners(
          `ops.job_silent:${s.name}:${hour}`,
          'Scheduled job is silent',
          `${s.name} has not finished a round for more than ${Math.round((SILENCE_FACTOR * s.everyMs) / 60000)} minutes.`,
        );
      }
    }
    this.ops.lastWatchdogAt = now.toISOString();
    this.ops.lastFindings = findings;
    return created;
  }
}
