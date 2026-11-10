'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ErrorState } from '@/components/states/error-state';
import {
  KIND_LABEL, appendPage, entryAmount, entryHref, entryLabel, filterByKind, groupByDay, historyPath, kindsIn, timeOf,
  type CustomerHistory as History, type HistoryEntry, type HistoryKind,
} from '@/lib/customer-history';
import { apiFetch } from '@/lib/fetch';
import { formatCents } from '@/lib/money';

/**
 * History tab of Customer 360 (D07): delivery rounds and decisions, work
 * requests and problem reports, appointments, invoices and payments, newest
 * first. The API sends only what the signed-in person may see; internal notes
 * arrive for management only and are marked as such here.
 */
export function CustomerHistory({ customerId }: { customerId: string }) {
  const [items, setItems] = useState<HistoryEntry[] | null>(null);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [kind, setKind] = useState<HistoryKind | 'all'>('all');
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (before: string | null, shown: HistoryEntry[]) => {
      const page = await apiFetch<History>(historyPath(customerId, before));
      setItems(appendPage(shown, page.items));
      setNextBefore(page.nextBefore);
    },
    [customerId],
  );

  const first = useCallback(() => {
    setItems(null);
    setError('');
    load(null, []).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load the history.'));
  }, [load]);

  useEffect(first, [first]);

  const more = () => {
    if (!items || !nextBefore || loadingMore) return;
    setLoadingMore(true);
    load(nextBefore, items)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load more of the history.'))
      .finally(() => setLoadingMore(false));
  };

  if (error && !items) return <ErrorState title="The history could not be loaded" message={error} onRetry={first} />;
  if (!items) return <p className="p-6 text-sm text-muted" role="status">Loading the history…</p>;
  if (items.length === 0) {
    return <p className="rounded-xl border border-dashed border-line bg-white px-5 py-8 text-center text-sm text-muted">Nothing has happened with this customer yet.</p>;
  }

  const kinds = kindsIn(items);
  const shown = filterByKind(items, kind);

  return (
    <div className="space-y-4" data-testid="customer-history">
      {kinds.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Show">
          {(['all', ...kinds] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${kind === k ? 'border-accent bg-accent/10 text-ink' : 'border-line text-muted hover:text-ink'}`}
            >
              {k === 'all' ? 'Everything' : KIND_LABEL[k]}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 && <p className="px-1 text-sm text-muted">Nothing of this kind in the part loaded so far.</p>}

      {groupByDay(shown).map((group) => (
        <section key={group.day} aria-label={group.day} className="overflow-hidden rounded-xl border border-line bg-white">
          <h3 className="border-b border-line bg-slate-50 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-muted">{group.day}</h3>
          <ul className="divide-y divide-line">
            {group.items.map((e) => {
              const amount = entryAmount(e);
              return (
                <li key={e.id} className="px-5 py-3 text-sm" data-kind={e.kind} data-event={e.event}>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="tabular-nums text-xs text-muted">{timeOf(e.at)}</span>
                    <span className="font-medium text-ink">{entryLabel(e)}</span>
                    {e.internal && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900">Internal note</span>}
                    {e.status && <span className="text-xs text-muted">{e.status.replaceAll('_', ' ').toLowerCase()}</span>}
                    {amount && <span className="tabular-nums text-xs text-muted">{formatCents(amount.cents, amount.currency)}</span>}
                  </div>
                  <Link href={entryHref(e)} className="mt-0.5 block break-words text-accent hover:underline">{e.title}</Link>
                  {e.note && <p className="mt-1 whitespace-pre-wrap break-words text-slate-700">{e.note}</p>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {nextBefore && (
        <button type="button" onClick={more} disabled={loadingMore} className="rounded-lg border border-line px-4 py-2 text-sm font-medium disabled:opacity-60">
          {loadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}
