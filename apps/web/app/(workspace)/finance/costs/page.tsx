'use client';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetch';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/states/error-state';

type CostRecord = { id: string; description?: string; amountCents: number; currency: string; recordedAt?: string; project?: { name: string } };

function fmt(cents: number, currency = 'EUR') {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(cents / 100);
}

export default function CostsPage() {
  const [items, setItems] = useState<CostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true); setLoadError(null);
    apiFetch<CostRecord[]>('/finance/costs').then(setItems)
      // A failed load is not "no records": say so and offer another try (F04).
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Could not load the records.'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Finance" title="Cost Records" description="All cost entries." />
      {loading && <p className="text-sm text-muted">Loading…</p>}
      {loadError && <ErrorState title="Cost records could not be loaded" message={loadError} onRetry={load} />}
      {!loading && !loadError && items.length === 0 && <p className="text-center text-sm text-muted py-8">No cost records yet.</p>}
      {items.length > 0 && (
        <table className="w-full rounded-xl border border-line overflow-hidden bg-white">
          <thead className="bg-slate-50 text-xs font-semibold text-muted uppercase">
            <tr>{['Description','Project','Amount','Date'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-ink">{r.description || '—'}</td>
                <td className="px-4 py-3 text-sm text-muted">{r.project?.name || '—'}</td>
                <td className="px-4 py-3 text-sm font-medium text-red-600">{fmt(r.amountCents, r.currency)}</td>
                <td className="px-4 py-3 text-sm text-muted">{r.recordedAt ? new Date(r.recordedAt).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}