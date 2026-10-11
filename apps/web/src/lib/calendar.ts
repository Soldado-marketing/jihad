/**
 * Calendar date logic (MAOS-T104). All in UTC so an item due "on" a date
 * (stored at UTC midnight) is shown on that date for every viewer, and the
 * functions are deterministic for tests. Weeks start on Monday.
 */

export type CalendarView = 'month' | 'week' | 'list';
export type CalendarItem = { id: string; type: string; title: string; at: string; status: string };

const DAY = 24 * 60 * 60 * 1000;

export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Monday of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const day = startOfUtcDay(d);
  const offset = (day.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(day.getTime() - offset * DAY);
}

/** The 6×7 grid of days shown for the month containing `anchor`. */
export function monthGrid(anchor: Date): Date[] {
  const first = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getTime() + i * DAY));
}

/** The [from, to) range to request for a view (the API allows at most 62 days). */
export function rangeFor(view: CalendarView, anchor: Date): { from: Date; to: Date } {
  if (view === 'week') {
    const from = startOfWeek(anchor);
    return { from, to: new Date(from.getTime() + 7 * DAY) };
  }
  const grid = monthGrid(anchor);
  return { from: grid[0], to: new Date(grid[41].getTime() + DAY) };
}

/** The anchor one step earlier (-1) or later (+1). */
export function shiftAnchor(view: CalendarView, anchor: Date, step: -1 | 1): Date {
  if (view === 'week') return new Date(startOfWeek(anchor).getTime() + step * 7 * DAY);
  return new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + step, 1));
}

export function groupByDay<T extends { at: string }>(items: readonly T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = item.at.slice(0, 10);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

export function viewTitle(view: CalendarView, anchor: Date): string {
  if (view === 'week') {
    const from = startOfWeek(anchor);
    const to = new Date(from.getTime() + 6 * DAY);
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    return `${fmt(from)} – ${fmt(to)} ${to.getUTCFullYear()}`;
  }
  return anchor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Where a calendar item links to. */
export function itemHref(item: CalendarItem): string {
  switch (item.type) {
    case 'task':
      return `/tasks/${item.id}`;
    case 'approval':
      return `/approvals/${item.id}`;
    case 'invoice':
      return `/finance/invoices/${item.id}`;
    case 'meeting':
      return '/crm/meetings';
    case 'followUp':
      return '/crm/follow-ups';
    default:
      return '#';
  }
}
