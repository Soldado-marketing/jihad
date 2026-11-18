import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { LabelsRepository } from './labels.repository';

@Injectable()
export class LabelsService {
  private readonly logger = new Logger(LabelsService.name);

  constructor(
    private readonly repo: LabelsRepository,
    private readonly resourceScope: ResourceScopeService,
    private readonly audit: AuditService,
  ) {}

  listLabels(tenantId: string) {
    return this.repo.list(tenantId);
  }

  createLabel(tenantId: string, dto: CreateLabelDto) {
    return this.repo.create(tenantId, dto);
  }

  updateLabel(tenantId: string, id: string, dto: UpdateLabelDto) {
    return this.repo.update(tenantId, id, dto);
  }

  async deleteLabel(tenantId: string, id: string) {
    await this.repo.delete(tenantId, id);
  }

  /**
   * A label goes on a task the caller may see, like any other change to the
   * task (G10): someone limited to their own tasks gets "not found" for the
   * rest. Each real change is recorded on the task.
   */
  async assignLabel(tenantId: string, actorId: string, taskId: string, labelId: string) {
    const { row, added } = await this.repo.assignLabel(tenantId, taskId, labelId, await this.taskScope(tenantId, actorId));
    if (added) await this.record(tenantId, actorId, 'task.label.added', taskId, labelId);
    return row;
  }

  async removeLabel(tenantId: string, actorId: string, taskId: string, labelId: string) {
    const removed = await this.repo.removeLabel(tenantId, taskId, labelId, await this.taskScope(tenantId, actorId));
    if (removed > 0) await this.record(tenantId, actorId, 'task.label.removed', taskId, labelId);
  }

  private async taskScope(tenantId: string, actorId: string) {
    return this.resourceScope.taskWhere(await this.resourceScope.resolveWorkScope(tenantId, actorId));
  }

  /** Best-effort, like every task record: a failed audit write does not undo the change. */
  private async record(tenantId: string, actorId: string, action: string, taskId: string, labelId: string) {
    try {
      await this.audit.createAuditEvent({
        tenantId,
        actorId,
        resourceType: 'task',
        resourceId: taskId,
        action,
        permissionResult: AuditPermissionResult.ALLOWED,
        outcome: AuditOutcome.SUCCESS,
        payload: { labelId },
      });
    } catch {
      this.logger.warn(`audit_write_failed action=${action}`);
    }
  }
}
