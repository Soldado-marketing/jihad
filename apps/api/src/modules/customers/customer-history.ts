/**
 * Customer history (D07): the pure part. A history is one list of typed
 * entries, newest first, merged from several tables. Every source has a fixed
 * one-letter prefix, an entry's id is `<prefix>:<row id>`, and the list is
 * ordered by (time, id) descending. The cursor names the last entry of a
 * page, so the next page continues exactly after it — also when many entries
 * share one timestamp — without dropping or repeating one.
 */

export const HISTORY_DEFAULT_LIMIT = 50;
export const HISTORY_MAX_LIMIT = 100;
export const EXCERPT_LENGTH = 280;

export const HISTORY_SECTIONS = ['deliveries', 'conversations', 'appointments', 'invoices', 'finance'] as const;
export type HistorySection = (typeof HISTORY_SECTIONS)[number];

export type HistoryKind = 'delivery' | 'request' | 'problem' | 'invoice' | 'payment' | 'appointment';
export type HistoryEvent =
  | 'sent' | 'approved' | 'changes_requested' | 'rejected' | 'replied'
  | 'opened' | 'message' | 'resolved' | 'reopened'
  | 'invoice' | 'payment' | 'appointment';

/** One-letter source prefixes; their alphabetical order is part of the list order. */
export const SOURCE = Object.freeze({
  delivery: 'a', decision: 'b', conversation: 'c', message: 'd', state: 'e', invoice: 'f', payment: 'g', appointment: 'h',
} as const);
export type SourcePrefix = (typeof SOURCE)[keyof typeof SOURCE];

export interface HistoryEntry {
  /** `<source prefix>:<row id>`; unique within a customer's history. */
  id: string;
  at: Date;
  kind: HistoryKind;
  event: HistoryEvent;
  title: string;
  status?: string;
  /** Who spoke. Staff always speak as the company: no name, id or e-mail. */
  from?: 'client' | 'company';
  /** A management note the client never receives. */
  internal?: boolean;
  /** Bounded excerpt of a note or message. */
  note?: string;
  /** The record to open. */
  ref: { type: 'file' | 'request' | 'problem' | 'invoice' | 'task'; id: string };
  meta?: Record<string, string | number | null>;
}

export interface HistoryCursor {
  at: Date;
  prefix: string;
  rowId: string;
}

export function excerpt(text: string | null | undefined): string | undefined {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return undefined;
  return clean.length > EXCERPT_LENGTH ? `${clean.slice(0, EXCERPT_LENGTH - 1)}…` : clean;
}

export const entryId = (prefix: string, rowId: string): string => `${prefix}:${rowId}`;

export function encodeCursor(entry: Pick<HistoryEntry, 'at' | 'id'>): string {
  return `${entry.at.toISOString()}|${entry.id}`;
}

const PREFIXES: readonly string[] = Object.values(SOURCE);
const ROW_ID = /^[A-Za-z0-9_-]{1,64}$/;

export type HistoryQuery =
  | { ok: true; limit: number; cursor: HistoryCursor | null }
  | { ok: false; code: 'INVALID_LIMIT' | 'INVALID_BEFORE' };

/** Validates the query strings; anything malformed is refused, never guessed. */
export function parseHistoryQuery(limit?: string, before?: string): HistoryQuery {
  let size = HISTORY_DEFAULT_LIMIT;
  if (limit !== undefined) {
    if (!/^\d{1,3}$/.test(limit)) return { ok: false, code: 'INVALID_LIMIT' };
    size = Number(limit);
    if (size < 1 || size > HISTORY_MAX_LIMIT) return { ok: false, code: 'INVALID_LIMIT' };
  }
  if (before === undefined) return { ok: true, limit: size, cursor: null };
  const cut = before.indexOf('|');
  if (cut < 1) return { ok: false, code: 'INVALID_BEFORE' };
  const at = new Date(before.slice(0, cut));
  const id = before.slice(cut + 1);
  const prefix = id.slice(0, 1);
  const rowId = id.slice(2);
  if (Number.isNaN(at.getTime()) || at.toISOString() !== before.slice(0, cut)) return { ok: false, code: 'INVALID_BEFORE' };
  if (id.charAt(1) !== ':' || !PREFIXES.includes(prefix) || !ROW_ID.test(rowId)) return { ok: false, code: 'INVALID_BEFORE' };
  return { ok: true, limit: size, cursor: { at, prefix, rowId } };
}

/** (time, id) descending: the one order every page and every source agrees on. */
export function compareEntries(a: Pick<HistoryEntry, 'at' | 'id'>, b: Pick<HistoryEntry, 'at' | 'id'>): number {
  const byTime = b.at.getTime() - a.at.getTime();
  if (byTime !== 0) return byTime;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

/**
 * The rows of one source that come after the cursor: older, or at the same
 * instant with a smaller id. Sources whose prefix sorts before the cursor's
 * still owe their rows of that instant; sources after it have shown them.
 */
export function afterCursor(prefix: string, column: string, cursor: HistoryCursor | null): Record<string, unknown> {
  if (!cursor) return {};
  if (prefix < cursor.prefix) return { [column]: { lte: cursor.at } };
  if (prefix > cursor.prefix) return { [column]: { lt: cursor.at } };
  return { OR: [{ [column]: { lt: cursor.at } }, { [column]: cursor.at, id: { lt: cursor.rowId } }] };
}

/** Merges what the sources returned into one page and names the next cursor. */
export function pageHistory(entries: HistoryEntry[], limit: number): { items: HistoryEntry[]; nextBefore: string | null } {
  const sorted = [...entries].sort(compareEntries);
  const items = sorted.slice(0, limit);
  return { items, nextBefore: sorted.length > limit && items.length ? encodeCursor(items[items.length - 1]) : null };
}
