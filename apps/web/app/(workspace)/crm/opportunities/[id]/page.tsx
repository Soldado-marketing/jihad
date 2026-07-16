'use client';

import { use, useEffect, useState } from 'react';
import { OpportunityDetail } from '@/components/crm/opportunity-detail';
import { type PipelineStatus } from '@/components/crm/pipeline-badge';
import { apiFetch } from '@/lib/fetch';

type Opportunity = { id: string; title: string; status: PipelineStatus; valueCents?: number; currency?: string };

export default function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Opportunity>(`/opportunities/${id}`)
      .then(setOpp)
      .catch(() => setOpp(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-sm text-slate-500 p-6">Loading…</p>;
  if (!opp) return <p className="text-sm text-red-500 p-6">Opportunity not found.</p>;

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
