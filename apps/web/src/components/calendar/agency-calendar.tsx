'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ErrorState } from '@/components/states/error-state';
import { apiFetch } from '@/lib/fetch';
import {
  dayKey,
  groupByDay,
  itemHref,
  monthGrid,
  rangeFor,
  shiftAnchor,
  startOfWeek,
  viewTitle,
  type CalendarItem,
  type CalendarView,
} from '@/lib/calendar';

const TYPE_DOT: Record<string, string> = {
  task: 'bg-brand',
  meeting: 'bg-accent',
  followUp: 'bg-warning',
  approval: 'bg-blue-500',
  invoice: 'bg-slate-500',
};
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function Entry({ item }: { item: CalendarItem }) {
  return (
    <Link href={itemHref(item)} className="flex items-center gap-1.5 truncate rounded px-1 py-0.5 text-xs text-ink hover:bg-slate-100">
      <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${TYPE_DOT[item.type] ?? 'bg-slate-400'}`} />
      <span className="truncate">{item.title}</span>
    </Link>
  );
}

/**
 * Month / week / list calendar over GET /calendar (MAOS-T104). The API
 * decides which types the caller may see; `types` narrows them further
 * (the tasks page shows tasks only).
 */
export function AgencyCalendar({ types }: { types?: string[] }) {
  const [view, setView] = useState<CalendarView>('month');
  const [anchor, setAnchor] = useState(() => new Date());
  const [items, setItems] = useState<CalendarItem[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setItems(null);
    const { from, to } = rangeFor(view, anchor);
    const qs = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
    if (types?.length) qs.set('types', types.join(','));
    try {
      const res = await apiFetch<{ items: CalendarItem[] }>(`/calendar?${qs.toString()}`);
      setItems(res.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the calendar.');
    }
  }, [view, anchor, types]);

  useEffect(() => {
    void load();
  }, [load]);

  const byDay = groupByDay(items ?? []);
  const today = dayKey(new Date());
  const days =
    view === 'week'
      ? Array.from({ length: 7 }, (_, i) => new Date(startOfWeek(anchor).getTime() + i * 86400000))
      : monthGrid(anchor);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setAnchor(shiftAnchor(view, anchor, -1))} aria-label="Previous" className="rounded-md border border-line px-2 py-1 text-sm">
            ‹
          </button>
          <button type="button" onClick={() => setAnchor(new Date())} className="rounded-md border border-line px-2 py-1 text-sm">
            Today
          </button>
          <button type="button" onClick={() => setAnchor(shiftAnchor(view, anchor, 1))} aria-label="Next" className="rounded-md border border-line px-2 py-1 text-sm">
            ›
          </button>
          <h2 className="ml-2 text-base font-semibold text-ink">{viewTitle(view, anchor)}</h2>
        </div>
        <div role="group" aria-label="Calendar view" className="flex overflow-hidden rounded-lg border border-line text-sm">
          {(['month', 'week', 'list'] as CalendarView[]).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`px-3 py-1.5 capitalize ${view === v ? 'bg-slate-100 font-medium text-ink' : 'text-muted'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorState title="Could not load the calendar" message={error} onRetry={() => void load()} />}
      {!error && items === null && <p className="text-sm text-muted">Loading…</p>}

      {!error && items !== null && view !== 'list' && (
        <div className="overflow-x-auto">
          <div className="grid min-w-[42rem] grid-cols-7 overflow-hidden rounded-xl border border-line bg-line gap-px">
            {WEEKDAYS.map((d) => (
              <div key={d} className="bg-slate-50 px-2 py-1 text-xs font-semibold text-muted">
                {d}
              </div>
            ))}
            {days.map((d) => {
              const key = dayKey(d);
              const inMonth = view === 'week' || d.getUTCMonth() === anchor.getUTCMonth();
              const entries = byDay.get(key) ?? [];
              return (
                <div key={key} className={`min-h-24 bg-white p-1 ${inMonth ? '' : 'bg-slate-50 text-muted'}`}>
                  <p className={`mb-1 text-right text-xs ${key === today ? 'font-bold text-brand' : 'text-muted'}`}>{d.getUTCDate()}</p>
                  <div className="space-y-0.5">
                    {entries.slice(0, view === 'week' ? 20 : 3).map((e) => (
                      <Entry key={`${e.type}-${e.id}`} item={e} />
                    ))}
                    {view === 'month' && entries.length > 3 && <p className="px-1 text-xs text-muted">+{entries.length - 3} more</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!error && items !== null && view === 'list' && (
        items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Nothing scheduled in this period.</p>
        ) : (
          <ol className="divide-y divide-line rounded-xl border border-line bg-white">
            {[...byDay.entries()].map(([key, entries]) => (
              <li key={key} className="px-4 py-3">
                <p className="mb-1 text-xs font-semibold text-muted">
                  {new Date(`${key}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}
                </p>
                {entries.map((e) => (
                  <Entry key={`${e.type}-${e.id}`} item={e} />
                ))}
              </li>
            ))}
          </ol>
        )
      )}
    </div>
  );
}
