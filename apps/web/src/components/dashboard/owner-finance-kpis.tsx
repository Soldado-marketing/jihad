'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/fetch';
import { formatCents } from '@/lib/money';
import { financeKpis, type FinanceSummary } from '@/lib/ops-dashboard';

/**
 * Finance KPIs for the operations dashboard (MAOS D7). Rendered only for the
 * OWNER - the API's finance endpoints are OWNER-only (sensitive) - and if the
 * API still refuses, the section disappears rather than showing a guess.
 */
export function OwnerFinanceKpis() {
  const [state, setState] = useState<'loading' | 'hidden' | FinanceSummary>('loading');

  useEffect(() => {
    apiFetch<FinanceSummary>('/finance/summary')
      .then(setState)
      .catch(() => setState('hidden'));
  }, []);

  if (state === 'hidden') return null;

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Finance · Owner only</h2>
      {state === 'loading' ? (
        <div className="h-20 animate-pulse rounded-2xl border border-line bg-slate-100" />
      ) : (
        <FinanceCards summary={state} />
      )}
    </section>
  );
}

function FinanceCards({ summary }: { summary: FinanceSummary }) {
  const k = financeKpis(summary);
  const cards = [
    { label: 'Outstanding', value: formatCents(k.outstandingCents, k.currency), highlight: k.outstandingCents > 0 },
    { label: 'Invoiced', value: formatCents(k.invoicedCents, k.currency) },
    { label: 'Paid', value: formatCents(k.paidCents, k.currency) },
    {
      label: 'Margin',
      value: k.marginPercent === null ? formatCents(k.marginCents, k.currency) : `${formatCents(k.marginCents, k.currency)} (${k.marginPercent}%)`,
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Link
          key={c.label}
          href="/finance"
          className={`flex flex-col gap-1 rounded-2xl border p-5 shadow-card transition hover:-translate-y-0.5 ${
            c.highlight ? 'border-amber-200 bg-amber-50' : 'border-line bg-panel hover:bg-slate-50'
          }`}
        >
          <span className="text-xl font-bold tabular-nums text-ink">{c.value}</span>
          <span className="text-xs font-medium text-slate-500">{c.label}</span>
        </Link>
      ))}
    </div>
  );
}
