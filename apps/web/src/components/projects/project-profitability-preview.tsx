'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetch';
import { formatCents } from '@/lib/money';
import { formatMinutes } from '@/lib/time-entries';

type Row = {
  projectId: string | null;
  revenueCents: number;
  recordedCostCents: number;
  labourCostCents: number;
  costCents: number;
  marginCents: number;
  marginPercent: number | null;
  ratedMinutes: number;
  unratedMinutes: number;
  incomplete: boolean;
};

/**
 * Project profitability preview (MAOS-T76; Blueprint §15): revenue, recorded
 * and labour cost, contribution and margin, from the OWNER-only finance API
 * (T74). Like the dashboard finance KPIs it renders nothing when the API
 * refuses, so no other role ever sees money here.
 */
export function ProjectProfitabilityPreview({ projectId }: { projectId: string }) {
  const [state, setState] = useState<'loading' | 'hidden' | { row: Row | null; currency: string }>('loading');

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ currency: string; projects: Row[] }>('/finance/profitability')
      .then((r) => !cancelled && setState({ row: r.projects.find((p) => p.projectId === projectId) ?? null, currency: r.currency }))
      .catch(() => !cancelled && setState('hidden'));
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (state === 'hidden' || state === 'loading') return null;
  const { row, currency } = state;

  return (
    <section className="rounded-xl border border-line bg-white p-5" aria-label="Profitability">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Profitability (owner only)</h2>
      {!row && <p className="mt-2 text-sm text-muted">No revenue, costs or rated time on this project yet.</p>}
      {row && (
        <>
          <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-5">
            <div><dt className="text-xs text-muted">Revenue</dt><dd className="tabular-nums text-ink">{formatCents(row.revenueCents, currency)}</dd></div>
            <div><dt className="text-xs text-muted">Recorded costs</dt><dd className="tabular-nums text-ink">{formatCents(row.recordedCostCents, currency)}</dd></div>
            <div><dt className="text-xs text-muted">Labour ({formatMinutes(row.ratedMinutes)} h)</dt><dd className="tabular-nums text-ink">{formatCents(row.labourCostCents, currency)}</dd></div>
            <div><dt className="text-xs text-muted">Contribution</dt><dd className="tabular-nums font-medium text-ink">{row.incomplete ? '≤ ' : ''}{formatCents(row.marginCents, currency)}</dd></div>
            <div><dt className="text-xs text-muted">Margin</dt><dd className="tabular-nums text-ink">{row.marginPercent === null ? '—' : `${row.incomplete ? '≤ ' : ''}${row.marginPercent}%`}</dd></div>
          </dl>
          {row.incomplete && (
            <p role="note" className="mt-3 text-xs text-amber-700">
              {formatMinutes(row.unratedMinutes)} h without a rate are not priced: costs are a minimum and the margin a maximum.
            </p>
          )}
        </>
      )}
    </section>
  );
}
