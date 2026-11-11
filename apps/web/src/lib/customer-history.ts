/**
 * Customer history (D07): view helpers over GET /customers/:id/history.
 * Pure - no React, no fetch, no import. The API decides what a caller may
 * see; nothing here adds, guesses or reorders an entry.
 */

export type HistoryKind = 'delivery' | 'request' | 'problem' | 'invoice' | 'payment' | 'appointment';
export type HistorySection = 'deliveries' | 'conversations' | 'appointments' | 'invoices' | 'finance';

export interface HistoryEntry {
  id: string;
  at: string;
  kind: HistoryKind;
  event: string;
  title: string;
  status?: string;
  from?: 'client' | 'company';
  internal?: boolean;
  note?: string;
  ref: { type: 'file' | 'request' | 'problem' | 'invoice' | 'task'; id: string };
  meta?: Record<string, string | number | null>;
}

export interface CustomerHistory {
  customer: { id: string; name: string };
  sections: HistorySection[];
  items: HistoryEntry[];
  nextBefore: string | null;
}

export const KIND_LABEL: Record<HistoryKind, string> = {
  delivery: 'Deliveries',
  request: 'Work requests',
  problem: 'Problem reports',
  appointment: 'Appointments',
  invoice: 'Invoices',
  payment: 'Payments',
};
const KIND_ORDER: HistoryKind[] = ['delivery', 'request', 'problem', 'appointment', 'invoice', 'payment'];

export function historyPath(customerId: string, before?: string | null): string {
  return `/customers/${customerId}/history${before ? `?before=${encodeURIComponent(before)}` : ''}`;
}

const who = (from: HistoryEntry['from']) => (from === 'client' ? 'the client' : 'the company');
const version = (e: HistoryEntry) => (typeof e.meta?.version === 'number' ? ` (version ${e.meta.version})` : '');

/** One plain sentence per entry: what happened. */
export function entryLabel(e: HistoryEntry): string {
  const subject = e.kind === 'request' ? 'Work request' : 'Problem report';
  switch (e.event) {
    case 'sent': return `Sent to the client for review${version(e)}`;
    case 'approved': return `Approved by the client${version(e)}`;
    case 'changes_requested': return `The client asked for changes${version(e)}`;
    case 'rejected': return `Rejected by the client${version(e)}`;
    case 'replied': return `The company replied and sent a new version`;
    case 'opened': return e.kind === 'request' ? 'The client requested new work' : 'The client reported a problem';
    case 'message': return e.internal ? 'Note for management' : e.from === 'client' ? 'Message from the client' : 'Answer to the client';
    case 'resolved': return `${subject} resolved`;
    case 'reopened': return `${subject} reopened by ${who(e.from)}`;
    case 'invoice': return 'Invoice created';
    case 'payment': return 'Payment recorded';
    case 'appointment': return 'Shooting appointment';
    default: return e.event;
  }
}

/** Where the record opens. Requests and problem reports open their list (they have no page of their own). */
export function entryHref(e: HistoryEntry): string {
  switch (e.ref.type) {
    case 'file': return `/files/${e.ref.id}`;
    case 'invoice': return `/finance/invoices/${e.ref.id}`;
    case 'task': return `/tasks/${e.ref.id}`;
    case 'request': return '/requests';
    case 'problem': return '/complaints';
  }
}

/** Amount in integer cents for the entries that carry one (the API sends amounts to the OWNER only). */
export function entryAmount(e: HistoryEntry): { cents: number; currency: string } | null {
  const cents = e.meta?.totalCents ?? e.meta?.amountCents;
  if (typeof cents !== 'number') return null;
  return { cents, currency: typeof e.meta?.currency === 'string' ? e.meta.currency : 'EUR' };
}

/** The kinds present, in a fixed order, for the filter. */
export function kindsIn(items: readonly HistoryEntry[]): HistoryKind[] {
  return KIND_ORDER.filter((k) => items.some((e) => e.kind === k));
}

export function filterByKind(items: readonly HistoryEntry[], kind: HistoryKind | 'all'): HistoryEntry[] {
  return kind === 'all' ? [...items] : items.filter((e) => e.kind === kind);
}

const two = (n: number) => String(n).padStart(2, '0');

/** The calendar day of an entry where the reader is (the browser's time zone), as YYYY-MM-DD. */
export function dayOf(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}

/** The time of day of an entry where the reader is, as HH:MM. */
export function timeOf(iso: string): string {
  const d = new Date(iso);
  return `${two(d.getHours())}:${two(d.getMinutes())}`;
}

/** Groups consecutive entries by the reader's calendar day; the order inside is the API's. */
export function groupByDay(items: readonly HistoryEntry[]): { day: string; items: HistoryEntry[] }[] {
  const groups: { day: string; items: HistoryEntry[] }[] = [];
  for (const e of items) {
    const day = dayOf(e.at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(e);
    else groups.push({ day, items: [e] });
  }
  return groups;
}

/** Appends a page without repeating an entry already shown. */
export function appendPage(shown: readonly HistoryEntry[], page: readonly HistoryEntry[]): HistoryEntry[] {
  const seen = new Set(shown.map((e) => e.id));
  return [...shown, ...page.filter((e) => !seen.has(e.id))];
}

