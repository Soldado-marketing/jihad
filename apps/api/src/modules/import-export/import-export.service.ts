import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isURL } from 'class-validator';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { relinkCustomers } from '../customers/customer-link';
import { PermissionService } from '../permissions/permission.service';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { CLIENT_SCOPE_KEY_PATTERN } from '../permissions/client-scope-assignment';
import { ResourceScopeService, WorkScope } from '../permissions/resource-scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { MAX_BUDGET_CENTS, PROJECT_NUMBER_PATTERN } from '../projects/dto/create-project.dto';
import { csvNumber, CsvError, csvText, parseCsv, toCsv } from './csv';

export const TRANSFER_TYPES = ['customers', 'projects', 'tasks'] as const;
export type TransferType = (typeof TRANSFER_TYPES)[number];

const RESOURCE: Record<TransferType, PermissionResource> = {
  customers: PermissionResource.CUSTOMER,
  projects: PermissionResource.PROJECT,
  tasks: PermissionResource.TASK,
};

/** ~96 KB stays under the API's default 100 KB JSON body limit. */
export const MAX_CSV_CHARS = 96_000;
export const MAX_ROWS = 500;
export const EXPORT_LIMIT = 5000;

const CUSTOMER_IMPORT_STATUSES = ['ACTIVE', 'INACTIVE'];
const PROJECT_STATUSES = ['ACTIVE', 'PAUSED', 'ARCHIVED'];
const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED', 'ARCHIVED'];
const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

/**
 * Columns per type. `importable` columns are read on import; the rest are
 * export-only and ignored on import, so an export file can be re-imported.
 * `needs` marks a column the caller must be allowed to see: `membership`
 * (team e-mail addresses, MEMBERSHIP read = OWNER by default) or `finance`
 * (project budget, the OWNER only, as in the projects API). Such a column
 * is left out of an export, and a file that contains it is refused on
 * import, for a caller without that right.
 */
interface Column {
  name: string;
  importable: boolean;
  required?: boolean;
  needs?: 'membership' | 'finance';
}
const COLUMNS: Record<TransferType, Column[]> = {
  customers: [
    { name: 'name', importable: true, required: true },
    { name: 'clientScopeKey', importable: true, required: true },
    { name: 'status', importable: true },
    { name: 'industry', importable: true },
    { name: 'website', importable: true },
    { name: 'notes', importable: true },
    { name: 'responsibleName', importable: false },
    { name: 'responsibleEmail', importable: true, needs: 'membership' },
  ],
  projects: [
    { name: 'projectNumber', importable: true },
    { name: 'name', importable: true, required: true },
    { name: 'status', importable: true },
    { name: 'customerKey', importable: true },
    { name: 'customerName', importable: false },
    { name: 'serviceType', importable: true },
    { name: 'deadline', importable: true },
    { name: 'description', importable: true },
    { name: 'ownerName', importable: false },
    { name: 'ownerEmail', importable: true, needs: 'membership' },
    { name: 'budgetCents', importable: true, needs: 'finance' },
  ],
  tasks: [
    { name: 'title', importable: true, required: true },
    { name: 'projectNumber', importable: true },
    { name: 'status', importable: true },
    { name: 'priority', importable: true },
    { name: 'dueDate', importable: true },
    { name: 'description', importable: true },
    { name: 'assigneeName', importable: false },
    { name: 'assigneeEmail', importable: true, needs: 'membership' },
  ],
};

export interface Caller {
  sub: string;
  tenantId: string;
  role: string;
}

export interface RowError {
  line: number;
  column?: string;
  code: string;
  message: string;
}

interface Rights {
  membership: boolean;
  finance: boolean;
}

type Row = Record<string, string>;
type Db = Prisma.TransactionClient;

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '');

/** Strict yyyy-mm-dd that is a real calendar day (no 2026-02-30 roll-over). */
function parseDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value ? null : d;
}

/**
 * CSV import/export for customers, projects and tasks (MAOS-T118; Blueprint
 * §43.2 "Import / export: CSV first ... existing domains; no ETL platform").
 *
 * - Only the canonical Customer / Project / Task tables, through the same
 *   rules as their own endpoints: tenant from the session, CONTRACTOR work
 *   scope, budget OWNER only, customer link derived from the customer's key
 *   (ADR-017), responsible / assignee an ACTIVE internal member.
 * - A file never carries an id: rows refer to customers by client key and
 *   to projects by project number, looked up in the caller's tenant only, so
 *   a row cannot point at another tenant's record.
 * - Import is create-only and all-or-nothing: the whole file is validated
 *   first; one bad row rejects the file with a report of every problem and
 *   writes nothing. A valid file is written in one transaction.
 * - Duplicates: a client key or project number that already exists, or that
 *   appears twice in the file, is an error. Tasks have no natural key, so
 *   every task row creates a task.
 */
@Injectable()
export class ImportExportService {
  private readonly logger = new Logger(ImportExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
    private readonly resourceScope: ResourceScopeService,
    private readonly audit: AuditService,
  ) {}

  parseType(raw: string): TransferType {
    if (!(TRANSFER_TYPES as readonly string[]).includes(raw)) {
      throw new BadRequestException({ code: 'UNKNOWN_TYPE', message: `Use one of: ${TRANSFER_TYPES.join(', ')}.` });
    }
    return raw as TransferType;
  }

  // ---------------------------------------------------------------- export

  async export(caller: Caller, type: TransferType): Promise<{ filename: string; csv: string; rows: number }> {
    await this.require(caller, PermissionAction.READ, type);
    const rights = await this.rights(caller);
    const scope = await this.resourceScope.resolveWorkScope(caller.tenantId, caller.sub);
    const columns = COLUMNS[type].filter((c) => !c.needs || rights[c.needs]);
    const records = await this.exportRows(caller.tenantId, type, scope);
    const rows = records.map((r) => columns.map((c) => r[c.name] ?? ''));
    await this.record(caller, `export.${type}`, { rows: rows.length, columns: columns.map((c) => c.name) });
    return { filename: `maos-${type}-${new Date().toISOString().slice(0, 10)}.csv`, csv: toCsv(columns.map((c) => c.name), rows), rows: rows.length };
  }

  private async exportRows(tenantId: string, type: TransferType, scope: WorkScope): Promise<Record<string, string>[]> {
    if (type === 'customers') {
      const rows = await this.prisma.customer.findMany({
        where: { tenantId },
        orderBy: { name: 'asc' },
        take: EXPORT_LIMIT,
        select: { name: true, clientScopeKey: true, status: true, industry: true, website: true, notes: true, responsibleUser: { select: { displayName: true, email: true } } },
      });
      return rows.map((c) => ({
        name: csvText(c.name),
        clientScopeKey: csvText(c.clientScopeKey),
        status: c.status,
        industry: csvText(c.industry),
        website: csvText(c.website),
        notes: csvText(c.notes),
        responsibleName: csvText(c.responsibleUser?.displayName),
        responsibleEmail: csvText(c.responsibleUser?.email),
      }));
    }
    if (type === 'projects') {
      const rows = await this.prisma.project.findMany({
        where: { tenantId, AND: [this.resourceScope.projectWhere(scope)] },
        orderBy: { createdAt: 'asc' },
        take: EXPORT_LIMIT,
        select: {
          projectNumber: true, name: true, status: true, serviceType: true, deadline: true, description: true, budgetCents: true,
          customer: { select: { clientScopeKey: true, name: true } },
          owner: { select: { displayName: true, email: true } },
        },
      });
      return rows.map((p) => ({
        projectNumber: csvText(p.projectNumber),
        name: csvText(p.name),
        status: p.status,
        customerKey: csvText(p.customer?.clientScopeKey),
        customerName: csvText(p.customer?.name),
        serviceType: csvText(p.serviceType),
        deadline: day(p.deadline),
        description: csvText(p.description),
        ownerName: csvText(p.owner?.displayName),
        ownerEmail: csvText(p.owner?.email),
        budgetCents: csvNumber(p.budgetCents),
      }));
    }
    const rows = await this.prisma.task.findMany({
      where: { tenantId, AND: [this.resourceScope.taskWhere(scope)] },
      orderBy: { createdAt: 'asc' },
      take: EXPORT_LIMIT,
      select: {
        title: true, status: true, priority: true, dueAt: true, description: true,
        project: { select: { projectNumber: true } },
        assignedTo: { select: { displayName: true, email: true } },
      },
    });
    return rows.map((t) => ({
      title: csvText(t.title),
      projectNumber: csvText(t.project?.projectNumber),
      status: t.status,
      priority: t.priority,
      dueDate: day(t.dueAt),
      description: csvText(t.description),
      assigneeName: csvText(t.assignedTo?.displayName),
      assigneeEmail: csvText(t.assignedTo?.email),
    }));
  }

  // ---------------------------------------------------------------- import

  async import(caller: Caller, type: TransferType, csv: string, commit: boolean) {
    await this.require(caller, PermissionAction.CREATE, type);
    if (csv.length > MAX_CSV_CHARS) {
      throw new BadRequestException({ code: 'CSV_TOO_LARGE', message: `The file may have at most ${MAX_CSV_CHARS} characters.` });
    }
    let parsed;
    try {
      parsed = parseCsv(csv, MAX_ROWS);
    } catch (err) {
      if (err instanceof CsvError) return this.rejected(type, 0, [{ line: err.line, code: `CSV_${err.code}`, message: err.message }]);
      throw err;
    }

    const rights = await this.rights(caller);
    const headerErrors = this.checkHeader(type, parsed.header, rights);
    if (headerErrors.length) return this.rejected(type, parsed.rows.length, headerErrors);
    if (parsed.rows.length === 0) return this.rejected(type, 0, [{ line: 1, code: 'NO_ROWS', message: 'The file has a header but no rows.' }]);

    const rows = parsed.rows.map((r) => ({
      line: r.line,
      values: Object.fromEntries(parsed.header.map((h, i) => [h, r.cells[i].trim()])) as Row,
    }));
    const scope = await this.resourceScope.resolveWorkScope(caller.tenantId, caller.sub);
    const plan = await this.validate(caller.tenantId, type, rows, scope);
    if (plan.errors.length) return this.rejected(type, rows.length, plan.errors);

    if (!commit) return { type, rows: rows.length, valid: true, committed: false, created: 0, errors: [] as RowError[] };

    let created: number;
    try {
      created = await this.prisma.$transaction((tx) => plan.write(tx), { timeout: 30_000 });
    } catch (err) {
      // A concurrent write took a key or number between validation and commit; nothing was written.
      if ((err as { code?: unknown } | null)?.code === 'P2002') {
        throw new ConflictException({ code: 'IMPORT_CONFLICT', message: 'A key or number in the file was taken meanwhile. Nothing was imported; validate again.' });
      }
      throw err;
    }
    await this.record(caller, `import.${type}`, { rows: rows.length, created });
    return { type, rows: rows.length, valid: true, committed: true, created, errors: [] as RowError[] };
  }

  private rejected(type: TransferType, rows: number, errors: RowError[]) {
    return { type, rows, valid: false, committed: false, created: 0, errors: errors.slice(0, 200), errorCount: errors.length };
  }

  private checkHeader(type: TransferType, header: string[], rights: Rights): RowError[] {
    const errors: RowError[] = [];
    const known = new Map(COLUMNS[type].map((c) => [c.name, c]));
    const seen = new Set<string>();
    for (const h of header) {
      const col = known.get(h);
      if (!col) errors.push({ line: 1, column: h, code: 'UNKNOWN_COLUMN', message: `Unknown column "${h}".` });
      else if (seen.has(h)) errors.push({ line: 1, column: h, code: 'DUPLICATE_COLUMN', message: `Column "${h}" appears twice.` });
      else if (col.needs && !rights[col.needs]) {
        errors.push({ line: 1, column: h, code: 'COLUMN_NOT_ALLOWED', message: `You may not import the column "${h}".` });
      }
      seen.add(h);
    }
    for (const c of COLUMNS[type]) {
      if (c.required && !seen.has(c.name)) errors.push({ line: 1, column: c.name, code: 'MISSING_COLUMN', message: `Column "${c.name}" is required.` });
    }
    return errors;
  }

  private async validate(tenantId: string, type: TransferType, rows: { line: number; values: Row }[], scope: WorkScope) {
    const errors: RowError[] = [];
    const err = (line: number, column: string, code: string, message: string) => errors.push({ line, column, code, message });
    const members = await this.internalMembersByEmail(tenantId, rows, type);
    const member = (line: number, column: string, email: string | undefined): string | null => {
      if (!email) return null;
      const id = members.get(email.toLowerCase());
      if (!id) err(line, column, 'NOT_A_MEMBER', `${column}: no active team member with this e-mail in this workspace.`);
      return id ?? null;
    };
    const text = (line: number, column: string, value: string | undefined, min: number, max: number): string | undefined => {
      if (!value) {
        if (min > 0) err(line, column, 'REQUIRED', `${column} is required.`);
        return undefined;
      }
      if (value.length < min || value.length > max) err(line, column, 'LENGTH', `${column}: ${min}-${max} characters.`);
      return value;
    };
    const oneOf = (line: number, column: string, value: string | undefined, allowed: string[]): string | undefined => {
      if (!value) return undefined;
      if (!allowed.includes(value)) err(line, column, 'INVALID_VALUE', `${column} must be one of ${allowed.join(', ')}.`);
      return value;
    };
    const date = (line: number, column: string, value: string | undefined): Date | undefined => {
      if (!value) return undefined;
      const d = parseDay(value);
      if (!d) err(line, column, 'INVALID_DATE', `${column} must be a real date as YYYY-MM-DD.`);
      return d ?? undefined;
    };

    if (type === 'customers') {
      const keys = rows.map((r) => r.values.clientScopeKey).filter(Boolean);
      const existing = new Set(
        (await this.prisma.customer.findMany({ where: { tenantId, clientScopeKey: { in: keys } }, select: { clientScopeKey: true } })).map((c) => c.clientScopeKey),
      );
      const inFile = new Set<string>();
      const data: Prisma.CustomerUncheckedCreateInput[] = [];
      for (const { line, values: v } of rows) {
        const name = text(line, 'name', v.name, 1, 200);
        const key = v.clientScopeKey;
        if (!key) err(line, 'clientScopeKey', 'REQUIRED', 'clientScopeKey is required.');
        else if (!CLIENT_SCOPE_KEY_PATTERN.test(key)) err(line, 'clientScopeKey', 'INVALID_VALUE', 'clientScopeKey: 1-120 of letters, digits, dot, underscore, hyphen.');
        else if (existing.has(key)) err(line, 'clientScopeKey', 'DUPLICATE_EXISTING', 'A customer with this client key already exists.');
        else if (inFile.has(key)) err(line, 'clientScopeKey', 'DUPLICATE_IN_FILE', 'This client key appears twice in the file.');
        if (key) inFile.add(key);
        const status = oneOf(line, 'status', v.status, CUSTOMER_IMPORT_STATUSES);
        const industry = text(line, 'industry', v.industry, 0, 120);
        const notes = text(line, 'notes', v.notes, 0, 5000);
        if (v.website && (v.website.length > 300 || !isURL(v.website, { require_protocol: true, protocols: ['http', 'https'] }))) {
          err(line, 'website', 'INVALID_VALUE', 'website must be an http(s) URL.');
        }
        const responsibleUserId = member(line, 'responsibleEmail', v.responsibleEmail);
        data.push({
          tenantId, name: name ?? '', clientScopeKey: key ?? '', industry, notes, website: v.website || undefined, responsibleUserId,
          ...(status && { status: status as 'ACTIVE' | 'INACTIVE' }),
        });
      }
      return {
        errors,
        write: async (tx: Db) => {
          for (const d of data) {
            await tx.customer.create({ data: d, select: { id: true } });
            // Rows already carrying this key now belong to the new customer (ADR-017).
            await relinkCustomers(tx, tenantId, d.clientScopeKey);
          }
          return data.length;
        },
      };
    }

    if (type === 'projects') {
      const numbers = rows.map((r) => r.values.projectNumber).filter(Boolean);
      const keys = rows.map((r) => r.values.customerKey).filter(Boolean);
      const [taken, customers] = await Promise.all([
        this.prisma.project.findMany({ where: { tenantId, projectNumber: { in: numbers } }, select: { projectNumber: true } }),
        this.prisma.customer.findMany({ where: { tenantId, clientScopeKey: { in: keys } }, select: { id: true, clientScopeKey: true, status: true } }),
      ]);
      const takenSet = new Set(taken.map((p) => p.projectNumber));
      const customerByKey = new Map(customers.map((c) => [c.clientScopeKey, c]));
      const inFile = new Set<string>();
      const data: (Omit<Prisma.ProjectUncheckedCreateInput, 'projectNumber'> & { projectNumber?: string })[] = [];
      for (const { line, values: v } of rows) {
        const name = text(line, 'name', v.name, 2, 160);
        const number = v.projectNumber;
        if (number) {
          if (!PROJECT_NUMBER_PATTERN.test(number)) err(line, 'projectNumber', 'INVALID_VALUE', 'projectNumber: 1-40 letters, digits, dot, underscore or hyphen.');
          else if (takenSet.has(number)) err(line, 'projectNumber', 'DUPLICATE_EXISTING', 'This project number is already used.');
          else if (inFile.has(number)) err(line, 'projectNumber', 'DUPLICATE_IN_FILE', 'This project number appears twice in the file.');
          inFile.add(number);
        }
        const status = oneOf(line, 'status', v.status, PROJECT_STATUSES);
        let link: { customerId: string; clientScopeKey: string } | undefined;
        if (v.customerKey) {
          const c = customerByKey.get(v.customerKey);
          if (!c || c.status === 'ARCHIVED') err(line, 'customerKey', 'UNKNOWN_CUSTOMER', 'No active customer with this client key in this workspace.');
          else link = { customerId: c.id, clientScopeKey: c.clientScopeKey };
        }
        const serviceType = text(line, 'serviceType', v.serviceType, 0, 80);
        const description = text(line, 'description', v.description, 0, 2000);
        const deadline = date(line, 'deadline', v.deadline);
        const ownerUserId = member(line, 'ownerEmail', v.ownerEmail);
        let budgetCents: number | undefined;
        if (v.budgetCents) {
          // Integer cents only: "1250.00" or "1e3" is refused, never rounded.
          if (!/^\d{1,13}$/.test(v.budgetCents) || Number(v.budgetCents) > MAX_BUDGET_CENTS) {
            err(line, 'budgetCents', 'INVALID_VALUE', `budgetCents must be whole cents, 0 to ${MAX_BUDGET_CENTS}.`);
          } else budgetCents = Number(v.budgetCents);
        }
        data.push({
          tenantId, name: name ?? '', description, serviceType, deadline, ownerUserId, budgetCents, ...link,
          ...(status && { status: status as 'ACTIVE' | 'PAUSED' | 'ARCHIVED' }),
          ...(number && { projectNumber: number }),
        });
      }
      return {
        errors,
        write: async (tx: Db) => {
          // Automatic numbers continue after the highest "P-0007" in the tenant, skipping numbers in the file.
          const all = await tx.project.findMany({ where: { tenantId, projectNumber: { startsWith: 'P-' } }, select: { projectNumber: true } });
          let next = all.reduce((max, r) => {
            const m = /^P-(\d{1,9})$/.exec(r.projectNumber ?? '');
            return m ? Math.max(max, Number(m[1])) : max;
          }, 0);
          for (const d of data) {
            let projectNumber = d.projectNumber;
            while (!projectNumber) {
              next += 1;
              const candidate = `P-${String(next).padStart(4, '0')}`;
              if (!inFile.has(candidate)) projectNumber = candidate;
            }
            await tx.project.create({ data: { ...d, projectNumber }, select: { id: true } });
          }
          return data.length;
        },
      };
    }

    // tasks
    const numbers = rows.map((r) => r.values.projectNumber).filter(Boolean);
    const projects = await this.prisma.project.findMany({
      where: { tenantId, projectNumber: { in: numbers } },
      select: { id: true, projectNumber: true },
    });
    const projectByNumber = new Map(projects.map((p) => [p.projectNumber as string, p.id]));
    const data: Prisma.TaskUncheckedCreateInput[] = [];
    for (const { line, values: v } of rows) {
      const title = text(line, 'title', v.title, 2, 180);
      let projectId: string | undefined;
      if (v.projectNumber) {
        projectId = projectByNumber.get(v.projectNumber);
        if (!projectId) err(line, 'projectNumber', 'UNKNOWN_PROJECT', 'No project with this number in this workspace.');
        // A CONTRACTOR may only add tasks to projects they are a member of (T35).
        else if (scope && !scope.memberProjectIds.includes(projectId)) {
          err(line, 'projectNumber', 'PROJECT_NOT_ASSIGNED', 'You may not add tasks to this project.');
        }
      }
      const status = oneOf(line, 'status', v.status, TASK_STATUSES);
      const priority = oneOf(line, 'priority', v.priority, TASK_PRIORITIES);
      const dueAt = date(line, 'dueDate', v.dueDate);
      const description = text(line, 'description', v.description, 0, 2000);
      const assignedToUserId = member(line, 'assigneeEmail', v.assigneeEmail);
      data.push({
        tenantId, title: title ?? '', description, projectId, dueAt, assignedToUserId,
        priority: (priority ?? 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
        ...(status && { status: status as Prisma.TaskUncheckedCreateInput['status'] }),
      });
    }
    return {
      errors,
      write: async (tx: Db) => {
        await tx.task.createMany({ data });
        return data.length;
      },
    };
  }

  /** Active internal (non-CLIENT) members of the tenant named in the file, by lower-case e-mail. */
  private async internalMembersByEmail(tenantId: string, rows: { values: Row }[], type: TransferType): Promise<Map<string, string>> {
    const column = type === 'customers' ? 'responsibleEmail' : type === 'projects' ? 'ownerEmail' : 'assigneeEmail';
    const emails = [...new Set(rows.map((r) => r.values[column]?.toLowerCase()).filter((e): e is string => Boolean(e)))];
    if (emails.length === 0) return new Map();
    const found = await this.prisma.tenantMembership.findMany({
      where: { tenantId, status: 'ACTIVE', role: { not: 'CLIENT' }, user: { email: { in: emails, mode: 'insensitive' } } },
      select: { user: { select: { id: true, email: true } } },
    });
    return new Map(found.map((m) => [m.user.email.toLowerCase(), m.user.id]));
  }

  // ---------------------------------------------------------------- shared

  private async require(caller: Caller, action: PermissionAction, type: TransferType) {
    const d = await this.permissions.decide({ action, resource: RESOURCE[type] }, caller.sub, caller.tenantId, caller.role);
    if (!d.allowed) throw new ForbiddenException({ code: 'FORBIDDEN', reason: d.reason });
  }

  /**
   * Column rights. E-mail addresses: MEMBERSHIP read (as /users/members).
   * Budget: the ACTIVE OWNER from the database membership, exactly the rule
   * the projects API applies to budgetCents (T57) - not a custom grant.
   */
  private async rights(caller: Caller): Promise<Rights> {
    const [m, owner] = await Promise.all([
      this.permissions.decide({ action: PermissionAction.READ, resource: PermissionResource.MEMBERSHIP }, caller.sub, caller.tenantId, caller.role),
      this.prisma.tenantMembership.findUnique({
        where: { tenantId_userId: { tenantId: caller.tenantId, userId: caller.sub } },
        select: { role: true, status: true },
      }),
    ]);
    return { membership: m.allowed, finance: owner?.role === 'OWNER' && owner.status === 'ACTIVE' };
  }

  private async record(caller: Caller, action: string, payload: Record<string, unknown>) {
    try {
      await this.audit.createAuditEvent({
        tenantId: caller.tenantId,
        actorId: caller.sub,
        resourceType: 'data-transfer',
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
