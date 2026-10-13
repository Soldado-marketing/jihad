/**
 * Operations-first dashboard (MAOS D7). Pure view-model helpers: what needs
 * attention now, what is coming up, which projects are active, and the finance
 * numbers - all derived from data the API already scoped to the viewer. No
 * number here is invented: a section without data says so instead.
 */

import type { CalendarItem } from './calendar';
import type { MyWork, WorkTask } from './my-work';

const DAY = 24 * 60 * 60 * 1000;

export interface AttentionItem {
  key: 'overdue' | 'dueSoon' | 'blocked' | 'toDecide';
  label: string;
  count: number;
  href: string;
  urgent: boolean;
}

/** The four "act now" counts, in the order a person should handle them. */
export function attention(w: MyWork): AttentionItem[] {
  return [
    { key: 'overdue', label: 'Overdue tasks', count: w.tasks.overdue.length, href: '/my-work', urgent: true },
    { key: 'toDecide', label: 'Approvals to decide', count: w.approvals.toDecide.length, href: '/approvals', urgent: true },
    { key: 'dueSoon', label: 'Due in the next days', count: w.tasks.dueSoon.length, href: '/my-work', urgent: false },
    { key: 'blocked', label: 'Blocked tasks', count: w.tasks.blocked.length, href: '/my-work', urgent: false },
  ];
}

/** Overdue first (oldest first), then due soon (nearest first); each task once. */
export function nextTasks(w: MyWork, limit = 5): WorkTask[] {
  const byDue = (a: WorkTask, b: WorkTask) =>
    (a.dueAt ? Date.parse(a.dueAt) : Infinity) - (b.dueAt ? Date.parse(b.dueAt) : Infinity);
  const seen = new Set<string>();
  const out: WorkTask[] = [];
  for (const t of [...[...w.tasks.overdue].sort(byDue), ...[...w.tasks.dueSoon].sort(byDue)]) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    out.push(t);
    if (out.length === limit) break;
  }
  return out;
}

/** The calendar window the dashboard asks for: now until the end of day +days (UTC). */
export function upcomingRange(now: Date, days = 7): { from: string; to: string } {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + (days + 1) * DAY - 1);
  return { from: now.toISOString(), to: end.toISOString() };
}

/** Upcoming dated items, soonest first; done/cancelled items are not "upcoming". */
export function upcoming(items: readonly CalendarItem[], now: Date, limit = 8): CalendarItem[] {
  // Closed states of the calendar's sources (Task, Meeting, FollowUp, Approval, Invoice).
  const closed = new Set(['DONE', 'ARCHIVED', 'COMPLETED', 'CANCELED', 'APPROVED', 'REJECTED', 'PAID', 'VOID']);
  return items
    .filter((i) => Date.parse(i.at) >= now.getTime() && !closed.has(i.status.toUpperCase()))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .slice(0, limit);
}

export interface ProjectRow {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
  _count?: { tasks: number };
}

/** ACTIVE projects, most recently touched first. */
export function activeProjects<T extends ProjectRow>(projects: readonly T[], limit = 6): { shown: T[]; total: number } {
  const active = projects
    .filter((p) => p.status === 'ACTIVE')
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  return { shown: active.slice(0, limit), total: active.length };
}

export interface FinanceSummary {
  totalRevenueCents: number;
  totalCostCents: number;
  totalInvoicedCents: number;
  totalPaidCents: number;
  currency: string;
  marginCents: number;
  marginPercent: number | null;
}

/** Finance KPIs in integer cents; outstanding never goes below zero. */
export function financeKpis(s: FinanceSummary) {
  return {
    currency: s.currency,
    invoicedCents: s.totalInvoicedCents,
    paidCents: s.totalPaidCents,
    outstandingCents: Math.max(0, s.totalInvoicedCents - s.totalPaidCents),
    revenueCents: s.totalRevenueCents,
    marginCents: s.marginCents,
    marginPercent: s.marginPercent,
  };
}

/**
 * Finance is OWNER-only in the API (sensitive permission). The dashboard asks
 * only when the viewer is OWNER and still treats a refusal as "not shown".
 */
export function canSeeFinance(role: string | undefined): boolean {
  return role === 'OWNER';
}
