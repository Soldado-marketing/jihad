import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, TimeEntryStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { ResourceScopeService, WorkScope } from '../permissions/resource-scope.service';
import { costCents } from '../rates/rate-resolution';
import { RatesService } from '../rates/rates.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto';
import { TimeEntriesRepository, TimeEntryRow } from './time-entries.repository';

const EDITABLE: TimeEntryStatus[] = ['DRAFT', 'REJECTED'];
const STATUSES: readonly string[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'BILLED', 'REJECTED'];
export const LIST_LIMIT = 500;

interface Caller {
  tenantId: string;
  userId: string;
  /** From the database membership, never the token. */
  role: string;
}

/** Strict YYYY-MM-DD that is a real calendar day. */
function parseDay(value: string, field: string): Date {
  const d = new Date(`${value}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException({ code: 'INVALID_DATE', field, message: `${field} must be a real date as YYYY-MM-DD.` });
  }
  return d;
}

const invalidReference = (field: string): never => {
  throw new BadRequestException({ code: 'INVALID_REFERENCE', field, message: `${field} does not reference a record in this workspace.` });
};

/**
 * Time entries (MAOS-T72, ADR-018).
 *
 * - Everyone internal logs, edits and deletes only their OWN entries, and only
 *   while DRAFT or REJECTED (editing a rejected entry returns it to DRAFT).
 *   APPROVED and BILLED entries are never changed, only corrected by a new
 *   entry. OWNER and MANAGER read every entry of the tenant and approve or
 *   reject SUBMITTED ones. CLIENT has no access (no TIME_ENTRY grant).
 * - Project and task must belong to the caller's tenant, and the task to the
 *   project. A CONTRACTOR logs time only on assigned work: a member project,
 *   or a task assigned to them (T35). The customer is taken from the project.
 * - Rates and costs are never accepted from a request. On creation the rate
 *   resolved for the member and the entry day (T73: member -> role -> tenant)
 *   is frozen onto the entry with its cost; without one the entry is unrated.
 *   Editing a draft's minutes recomputes the cost from the FROZEN rate (the
 *   database formula); a date change keeps the frozen rate. Re-resolving is
 *   the OWNER's explicit re-rating (rates module). Rate and cost fields are
 *   returned to the OWNER only.
 * - State changes are conditional updates on the expected status, so a
 *   concurrent change answers 409 instead of overwriting.
 */
@Injectable()
export class TimeEntriesService {
  private readonly logger = new Logger(TimeEntriesService.name);

  constructor(
    private readonly repo: TimeEntriesRepository,
    private readonly resourceScope: ResourceScopeService,
    private readonly audit: AuditService,
    private readonly rates: RatesService,
  ) {}

  async caller(tenantId: string, userId: string): Promise<Caller> {
    const m = await this.repo.membership(tenantId, userId);
    if (!m || m.status !== 'ACTIVE' || m.role === 'CLIENT') throw new ForbiddenException({ code: 'FORBIDDEN', reason: 'time_entries_internal_only' });
    return { tenantId, userId, role: m.role };
  }

  private reviewer(c: Caller) {
    return c.role === 'OWNER' || c.role === 'MANAGER';
  }

  async list(c: Caller, q: { from?: string; to?: string; projectId?: string; userId?: string; status?: string }) {
    if (q.status !== undefined && !STATUSES.includes(q.status)) throw new BadRequestException({ code: 'INVALID_STATUS' });
    if (q.userId && q.userId !== c.userId && !this.reviewer(c)) throw new ForbiddenException({ code: 'FORBIDDEN', reason: 'own_entries_only' });
    const date: Prisma.DateTimeFilter = {};
    if (q.from) date.gte = parseDay(q.from, 'from');
    if (q.to) date.lte = parseDay(q.to, 'to');
    const where: Prisma.TimeEntryWhereInput = {
      ...(this.reviewer(c) ? (q.userId ? { userId: q.userId } : {}) : { userId: c.userId }),
      ...(q.projectId && { projectId: q.projectId }),
      ...(q.status && { status: q.status as TimeEntryStatus }),
      ...((q.from || q.to) && { date }),
    };
    const rows = await this.repo.list(c.tenantId, where, LIST_LIMIT);
    return rows.map((r) => this.present(r, c));
  }

  async get(c: Caller, id: string) {
    return this.present(await this.visible(c, id), c);
  }

  async create(c: Caller, dto: CreateTimeEntryDto) {
    const date = parseDay(dto.date, 'date');
    const { customerId } = await this.checkWork(c, dto.projectId, dto.taskId ?? null);
    // Frozen at creation (ADR-018 §3); later rate changes never alter this entry.
    const rate = await this.rates.resolve(c.tenantId, c.userId, date);
    const frozen = rate
      ? { rateCents: rate.rateCents, rateSource: rate.rateSource, currency: rate.currency, costCents: costCents(dto.minutes, rate.rateCents) }
      : {};
    const { id } = await this.write(() =>
      this.repo.create(c.tenantId, {
        userId: c.userId,
        createdByUserId: c.userId,
        date,
        minutes: dto.minutes,
        projectId: dto.projectId,
        taskId: dto.taskId ?? null,
        customerId,
        billable: dto.billable ?? true,
        note: dto.note,
        ...frozen,
      }),
    );
    await this.record(c, 'time_entry.created', id, { minutes: dto.minutes });
    return this.get(c, id);
  }

  async update(c: Caller, id: string, dto: UpdateTimeEntryDto) {
    const entry = await this.own(c, id);
    if (!EDITABLE.includes(entry.status)) this.locked();
    const data: Prisma.TimeEntryUncheckedUpdateManyInput = { status: 'DRAFT' };
    if (dto.date !== undefined) data.date = parseDay(dto.date, 'date');
    if (dto.minutes !== undefined) {
      data.minutes = dto.minutes;
      // Same frozen rate, new minutes: the cost follows the database formula.
      if (entry.rateCents !== null) data.costCents = costCents(dto.minutes, entry.rateCents);
    }
    if (dto.billable !== undefined) data.billable = dto.billable;
    if (dto.note !== undefined) data.note = dto.note;
    if (dto.projectId !== undefined || dto.taskId !== undefined) {
      const projectId = dto.projectId ?? entry.projectId;
      // A changed project with the old task left in place must still match.
      const taskId = dto.taskId !== undefined ? dto.taskId : entry.taskId;
      const { customerId } = await this.checkWork(c, projectId, taskId);
      Object.assign(data, { projectId, taskId, customerId });
    }
    const changed = await this.write(() => this.repo.updateIfStatus(c.tenantId, id, c.userId, EDITABLE, data));
    if (changed === 0) this.locked();
    await this.record(c, 'time_entry.updated', id, { fields: Object.keys(dto) });
    return this.get(c, id);
  }

  async submit(c: Caller, id: string) {
    await this.own(c, id);
    return this.transition(c, id, c.userId, ['DRAFT'], 'SUBMITTED', 'time_entry.submitted');
  }

  async approve(c: Caller, id: string) {
    if (!this.reviewer(c)) throw new ForbiddenException({ code: 'FORBIDDEN', reason: 'reviewers_only' });
    await this.visible(c, id);
    return this.transition(c, id, null, ['SUBMITTED'], 'APPROVED', 'time_entry.approved');
  }

  async reject(c: Caller, id: string, reason?: string) {
    if (!this.reviewer(c)) throw new ForbiddenException({ code: 'FORBIDDEN', reason: 'reviewers_only' });
    await this.visible(c, id);
    return this.transition(c, id, null, ['SUBMITTED'], 'REJECTED', 'time_entry.rejected', reason ? { reason } : undefined);
  }

  async remove(c: Caller, id: string) {
    const entry = await this.own(c, id);
    if (!EDITABLE.includes(entry.status)) this.locked();
    if ((await this.repo.deleteIfStatus(c.tenantId, id, c.userId, EDITABLE)) === 0) this.locked();
    await this.record(c, 'time_entry.deleted', id, { minutes: entry.minutes });
  }

  // ---------------------------------------------------------------- helpers

  private async transition(c: Caller, id: string, ownerId: string | null, from: TimeEntryStatus[], to: TimeEntryStatus, action: string, payload?: Record<string, unknown>) {
    const changed = await this.repo.updateIfStatus(c.tenantId, id, ownerId, from, { status: to });
    if (changed === 0) {
      throw new ConflictException({ code: 'TIME_ENTRY_STATE_CONFLICT', message: `Only a ${from.join(' or ')} entry can become ${to}.` });
    }
    await this.record(c, action, id, payload);
    return this.get(c, id);
  }

  /** The entry if the caller may see it (own, or any for OWNER/MANAGER); 404 otherwise. */
  private async visible(c: Caller, id: string): Promise<TimeEntryRow> {
    const row = await this.repo.get(c.tenantId, id, this.reviewer(c) ? {} : { userId: c.userId });
    if (!row) throw new NotFoundException('Time entry not found');
    return row;
  }

  /** The caller's own entry; a reviewer looking at someone else's gets 403 (they may see it, not change it). */
  private async own(c: Caller, id: string): Promise<TimeEntryRow> {
    const row = await this.visible(c, id);
    if (row.user.id !== c.userId) throw new ForbiddenException({ code: 'FORBIDDEN', reason: 'own_entries_only' });
    return row;
  }

  /** Project and task in this tenant, task in that project, and within a contractor's assigned work. */
  private async checkWork(c: Caller, projectId: string, taskId: string | null): Promise<{ customerId: string | null }> {
    const project = await this.repo.project(c.tenantId, projectId);
    if (!project) invalidReference('projectId');
    let task: { projectId: string | null; assignedToUserId: string | null } | null = null;
    if (taskId) {
      task = await this.repo.task(c.tenantId, taskId);
      if (!task) invalidReference('taskId');
      if (task!.projectId !== projectId) {
        throw new BadRequestException({ code: 'TASK_NOT_IN_PROJECT', field: 'taskId', message: 'The task does not belong to this project.' });
      }
    }
    const scope: WorkScope = await this.resourceScope.resolveWorkScope(c.tenantId, c.userId);
    if (scope && !scope.memberProjectIds.includes(projectId) && task?.assignedToUserId !== c.userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', reason: 'project_not_assigned' });
    }
    return { customerId: project!.customerId };
  }

  /** Database refusals become safe API errors instead of a 500 with driver text. */
  private async write<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      const e = err as { code?: string; message?: string };
      if (e.code === 'P2003') invalidReference('reference');
      if (typeof e.message === 'string' && e.message.includes('violates check constraint')) {
        throw new BadRequestException({ code: 'TIME_ENTRY_INVALID', message: 'The time entry breaks a rule of the workspace (minutes 1-1440, rate and cost).' });
      }
      throw err;
    }
  }

  private locked(): never {
    throw new ConflictException({ code: 'TIME_ENTRY_LOCKED', message: 'Only a draft or rejected entry can be changed; correct an approved entry with a new one.' });
  }

  /** Rates and costs are OWNER-only (ADR-018 §5); the day is returned as YYYY-MM-DD. */
  private present(r: TimeEntryRow, c: Caller) {
    const { rateCents, rateSource, currency, costCents, date, ...rest } = r;
    const base = { ...rest, date: date.toISOString().slice(0, 10) };
    return c.role === 'OWNER' ? { ...base, rateCents, rateSource, currency, costCents } : base;
  }

  private async record(c: Caller, action: string, resourceId: string, payload?: Record<string, unknown>) {
    try {
      await this.audit.createAuditEvent({
        tenantId: c.tenantId,
        actorId: c.userId,
        resourceType: 'time-entry',
        resourceId,
        action,
        permissionResult: AuditPermissionResult.ALLOWED,
        outcome: AuditOutcome.SUCCESS,
        payload,
      });
    } catch {
      this.logger.warn(`audit_write_failed action=${action}`);
    }
  }
}
