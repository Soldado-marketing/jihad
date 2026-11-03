import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { OpsAlertsService } from './ops-alerts.service';
import { SchedulerService, schedulerEnabled } from './scheduler.service';

/**
 * B06 — operational status for the OWNER (same sensitive permission as the
 * audit log): scheduler on/off, every job's counters and last outcome, the
 * last storage inventory and the watchdog's findings. Status words and
 * numbers only — never a key, a bucket name or a connection string.
 */
@Controller('health/ops')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class OpsController {
  constructor(
    private readonly scheduler: SchedulerService,
    private readonly ops: OpsAlertsService,
  ) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.AUDIT_EVENT, sensitive: true })
  status() {
    return {
      schedulerEnabled: schedulerEnabled(),
      activeTimers: this.scheduler.activeTimers,
      jobs: this.scheduler.status(),
      storage: this.ops.lastStorageCheck,
      watchdog: { lastRunAt: this.ops.lastWatchdogAt, findings: this.ops.lastFindings },
    };
  }
}
