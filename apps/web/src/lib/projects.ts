/**
 * Project enrichment UI helpers (MAOS-T58; Blueprint §11).
 *
 * The API (T57) decides everything: budgetCents is returned to the OWNER
 * only and only the OWNER may change it; the responsible person must be an
 * active team member; a customer link sets the project's client key on the
 * server. These helpers only shape what the pages show and send.
 */
import { formatCents, toCents } from './money';

export type ProjectStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export const PROJECT_STATUSES: readonly ProjectStatus[] = ['ACTIVE', 'PAUSED', 'ARCHIVED'];

export interface Progress {
  done: number;
  total: number;
  percent: number | null;
}

export interface ProjectRow {
  id: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  clientVisible?: boolean;
  projectNumber: string | null;
  serviceType: string | null;
  deadline: string | null;
  /** Present only for the OWNER. */
  budgetCents?: number | null;
  owner: { id: string; displayName: string | null } | null;
  customer: { id: string; name: string } | null;
  progress: Progress;
  _count?: { tasks: number };
}

export interface ProjectForm {
  name: string;
  status: ProjectStatus;
  projectNumber: string;
  serviceType: string;
  /** yyyy-mm-dd or '' */
  deadline: string;
  ownerUserId: string;
  customerId: string;
  /** major units, e.g. "1250.00", or '' */
  budget: string;
}

export const PROJECT_NUMBER_PATTERN = /^[A-Za-z0-9._-]{1,40}$/;
export const MAX_BUDGET_CENTS = 2_000_000_000;

export const canWriteProjects = (role?: string) => role === 'OWNER' || role === 'MANAGER';
/** Finance data: the OWNER only, as the API enforces. */
export const canSeeBudget = (role?: string) => role === 'OWNER';

/** Values for the filter bar and its text search (keys of the projects page). */
export function projectField(p: ProjectRow, key: string): string | null {
  switch (key) {
    case 'status': return p.status;
    case 'customer': return p.customer?.name ?? null;
    case 'service': return p.serviceType;
    case 'name': return p.name;
    case 'number': return p.projectNumber;
    default: return null;
  }
}

export function progressLabel(p: Progress): string {
  return p.percent === null ? 'No tasks' : `${p.percent}% · ${p.done}/${p.total}`;
}

/** Date part only; deadlines are days, not instants. */
export function deadlineDay(deadline: string | null): string {
  return deadline ? deadline.slice(0, 10) : '';
}

/** 'overdue' before today, 'soon' within 7 days, otherwise null. Archived projects carry no warning. */
export function deadlineState(p: Pick<ProjectRow, 'deadline' | 'status'>, today: string): 'overdue' | 'soon' | null {
  const day = deadlineDay(p.deadline);
  if (!day || p.status === 'ARCHIVED') return null;
  if (day < today) return 'overdue';
  const soon = new Date(`${today}T00:00:00Z`);
  soon.setUTCDate(soon.getUTCDate() + 7);
  return day <= soon.toISOString().slice(0, 10) ? 'soon' : null;
}

export function budgetLabel(p: Pick<ProjectRow, 'budgetCents'>): string {
  return p.budgetCents === undefined || p.budgetCents === null ? '—' : formatCents(p.budgetCents);
}

/** Integer cents to the "1250.00" form the input expects, without a float. */
export function centsToInput(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

export function formFrom(p: ProjectRow): ProjectForm {
  return {
    name: p.name,
    status: p.status,
    projectNumber: p.projectNumber ?? '',
    serviceType: p.serviceType ?? '',
    deadline: deadlineDay(p.deadline),
    ownerUserId: p.owner?.id ?? '',
    customerId: p.customer?.id ?? '',
    budget: p.budgetCents === undefined || p.budgetCents === null ? '' : centsToInput(p.budgetCents),
  };
}

type Result = { ok: true; body: Record<string, unknown> } | { ok: false; error: string };

/**
 * Only changed fields; '' clears an optional field (null). The budget is
 * sent only by the OWNER, and the client key is never sent: the server
 * derives it from the customer.
 */
export function updatePayload(before: ProjectRow, form: ProjectForm, role?: string): Result {
  const was = formFrom(before);
  const body: Record<string, unknown> = {};
  const name = form.name.trim();
  if (name.length < 2 || name.length > 160) return { ok: false, error: 'The name needs 2 to 160 characters.' };
  if (name !== was.name) body.name = name;
  if (form.status !== was.status) body.status = form.status;

  const number = form.projectNumber.trim();
  if (number && !PROJECT_NUMBER_PATTERN.test(number)) {
    return { ok: false, error: 'Project number: up to 40 letters, digits, dot, underscore or hyphen.' };
  }
  if (number !== was.projectNumber) body.projectNumber = number || null;

  const service = form.serviceType.trim();
  if (service.length > 80) return { ok: false, error: 'Service type: at most 80 characters.' };
  if (service !== was.serviceType) body.serviceType = service || null;

  if (form.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(form.deadline)) return { ok: false, error: 'Deadline must be a date.' };
  if (form.deadline !== was.deadline) body.deadline = form.deadline ? `${form.deadline}T00:00:00.000Z` : null;

  if (form.ownerUserId !== was.ownerUserId) body.ownerUserId = form.ownerUserId || null;
  if (form.customerId !== was.customerId) body.customerId = form.customerId || null;

  if (canSeeBudget(role)) {
    const budget = form.budget.trim();
    const cents = budget === '' ? null : toCents(budget);
    if (budget !== '' && (cents === null || cents > MAX_BUDGET_CENTS)) return { ok: false, error: 'Budget must be an amount like 1250.00.' };
    if (budget !== was.budget) body.budgetCents = cents;
  }
  return { ok: true, body };
}
