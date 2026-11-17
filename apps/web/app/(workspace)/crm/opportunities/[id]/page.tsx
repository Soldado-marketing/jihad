'use client';

import { useCallback, use, useEffect, useState } from 'react';
import { ErrorState } from '@/components/states/error-state';
import { OpportunityDetail } from '@/components/crm/opportunity-detail';
import { type PipelineStatus } from '@/components/crm/pipeline-badge';
import { apiFetch } from '@/lib/fetch';

type Opportunity = { id: string; title: string; status: PipelineStatus; valueCents?: number; currency?: string };

export default function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState<string | null>(null);
  const load = useCallback(() => {
    setLoading(true); setLoadError(null);
    apiFetch<Opportunity>(`/opportunities/${id}`)
      .then(setOpp)
      // Any failure used to read "not found"; now the reason is shown and the load can be repeated (F04).
      .catch((err) => { setOpp(null); setLoadError(err instanceof Error ? err.message : 'Opportunity not found.'); })
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-sm text-slate-500 p-6">Loading…</p>;
  if (!opp) return <div className="p-6"><ErrorState title="This opportunity could not be opened" message={loadError ?? 'Opportunity not found.'} onRetry={load} /></div>;

  const valueLabel = opp.valueCents != null
    ? `${opp.currency ?? '€'}${(opp.valueCents / 100).toFixed(2)}`
    : undefined;

  return (
    <OpportunityDetail
      id={opp.id}
      title={opp.title}
      status={opp.status}
      valueLabel={valueLabel}
    />
  );
}
