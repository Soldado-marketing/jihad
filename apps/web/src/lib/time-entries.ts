/**
 * Time & Costs page helpers (MAOS-T76) over the T72 TimeEntry API.
 *
 * The API decides everything: who sees which entries (own; OWNER/MANAGER
 * all), who may review, which states can change, and that rate and cost
 * reach the OWNER only. These helpers shape what the page shows and sends and
 * never invent a rate or a cost.
 */

export type TimeEntryStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'BILLED' | 'REJECTED';
export const TIME_ENTRY_STATUSES: readonly TimeEntryStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'BILLED', 'REJECTED'];

export interface TimeEntry {
  id: string;
  date: string; // YYYY-MM-DD
  minutes: number;
  billable: boolean;
  note: string | null;
  status: TimeEntryStatus;
  projectId: string;
  taskId: string | null;
  user: { id: string; displayName: string | null };
  project: { id: string; name: string; projectNumber: string | null };
  task: { id: string; title: string } | null;
  /** Present for the OWNER only. null = unrated. */
  rateCents?: number | null;
  rateSource?: 'MEMBER' | 'ROLE' | 'TENANT' | null;
  currency?: string | null;
  costCents?: number | null;
}

export const STATUS_LABEL: Record<TimeEntryStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  BILLED: 'Billed',
  REJECTED: 'Rejected',
};

/** OWNER and MANAGER review and see everyone's time (ADR-018 decision). */
export const canReview = (role?: string) => role === 'OWNER' || role === 'MANAGER';
/** Rates and costs are OWNER-only data (the API returns them to the OWNER only). */
export const canSeeCost = (role?: string) => role === 'OWNER';
export const canLogTime = (role?: string) => role === 'OWNER' || role === 'MANAGER' || role === 'EMPLOYEE' || role === 'CONTRACTOR';

/** Only the member changes their own DRAFT or REJECTED entry; APPROVED and BILLED are locked. */
export function isEditable(e: Pick<TimeEntry, 'status' | 'user'>, userId?: string): boolean {
  return e.user.id === userId && (e.status === 'DRAFT' || e.status === 'REJECTED');
}
export const canSubmit = (e: Pick<TimeEntry, 'status' | 'user'>, userId?: string) => e.user.id === userId && e.status === 'DRAFT';
export const canDecide = (e: Pick<TimeEntry, 'status'>, role?: string) => canReview(role) && e.status === 'SUBMITTED';

/**
 * Reads "90", "1:30" or "1.5" as minutes; whole minutes 1 to 1440 only.
 * Anything else is refused rather than rounded.
 */
export function parseDuration(input: string): number | null {
  const v = input.trim();
  let minutes: number;
  if (/^\d{1,4}$/.test(v)) minutes = Number(v);
  else if (/^\d{1,2}:\d{2}$/.test(v)) {
    const [h, m] = v.split(':').map(Number);
    if (m > 59) return null;
    minutes = h * 60 + m;
  } else if (/^\d{1,2}[.,]\d{1,2}$/.test(v)) {
    const [h, frac] = v.replace(',', '.').split('.');
    const exact = Number(h) * 60 + (Number(frac.padEnd(2, '0')) * 60) / 100;
    if (!Number.isInteger(exact)) return null;
    minutes = exact;
  } else return null;
  return minutes >= 1 && minutes <= 1440 ? minutes : null;
}

/** 90 -> "1:30" */
export function formatMinutes(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

export interface Totals {
  minutes: number;
  billableMinutes: number;
  /** OWNER view only: sum of stored costs of rated entries. */
  costCents: number;
  unratedMinutes: number;
}

/** Sums of the listed entries; cost only from stored values, unrated minutes counted separately. */
export function totals(entries: readonly TimeEntry[]): Totals {
  const t: Totals = { minutes: 0, billableMinutes: 0, costCents: 0, unratedMinutes: 0 };
  for (const e of entries) {
    t.minutes += e.minutes;
    if (e.billable) t.billableMinutes += e.minutes;
    if (e.costCents === null || e.costCents === undefined) t.unratedMinutes += e.minutes;
    else t.costCents += e.costCents;
  }
  return t;
}

export interface EntryForm {
  date: string;
  duration: string;
  projectId: string;
  taskId: string;
  billable: boolean;
  note: string;
}

type Result = { ok: true; body: Record<string, unknown> } | { ok: false; error: string };

const isDay = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

/** Create body: never a member, customer, status, rate or cost (the API refuses them). */
export function createPayload(f: EntryForm): Result {
  if (!isDay(f.date)) return { ok: false, error: 'Choose a date.' };
  const minutes = parseDuration(f.duration);
  if (minutes === null) return { ok: false, error: 'Duration: whole minutes from 1 to 1440, e.g. 90, 1:30 or 1.5.' };
  if (!f.projectId) return { ok: false, error: 'Choose a project.' };
  const note = f.note.trim();
  if (note.length > 2000) return { ok: false, error: 'The note can have at most 2000 characters.' };
  return {
    ok: true,
    body: { date: f.date, minutes, projectId: f.projectId, billable: f.billable, ...(f.taskId && { taskId: f.taskId }), ...(note && { note }) },
  };
}

/** Edit body: only changed fields; an emptied task or note is sent as null. */
export function updatePayload(before: TimeEntry, f: EntryForm): Result {
  const created = createPayload(f);
  if (!created.ok) return created;
  const b = created.body;
  const body: Record<string, unknown> = {};
  if (b.date !== before.date) body.date = b.date;
  if (b.minutes !== before.minutes) body.minutes = b.minutes;
  if (b.projectId !== before.projectId) body.projectId = b.projectId;
  if ((f.taskId || null) !== before.taskId) body.taskId = f.taskId || null;
  if (f.billable !== before.billable) body.billable = f.billable;
  if ((f.note.trim() || null) !== before.note) body.note = f.note.trim() || null;
  return { ok: true, body };
}

export function formFrom(e: TimeEntry): EntryForm {
  return { date: e.date, duration: formatMinutes(e.minutes), projectId: e.projectId, taskId: e.taskId ?? '', billable: e.billable, note: e.note ?? '' };
}

/** Query string for the list: from/to are dates, the rest exact filters the API understands. */
export function listQuery(q: { from?: string; to?: string; status?: string; projectId?: string; userId?: string }): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
}
