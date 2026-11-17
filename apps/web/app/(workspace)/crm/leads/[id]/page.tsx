'use client';

import { useCallback, use, useEffect, useState } from 'react';
import { ErrorState } from '@/components/states/error-state';
import { LeadDetail } from '@/components/crm/lead-detail';
import { type PipelineStatus } from '@/components/crm/pipeline-badge';
import { apiFetch } from '@/lib/fetch';

type Lead = { id: string; name: string; company?: string; status: PipelineStatus };

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState<string | null>(null);
  const load = useCallback(() => {
    setLoading(true); setLoadError(null);
    apiFetch<Lead>(`/leads/${id}`)
      .then(setLead)
      // Any failure used to read "not found"; now the reason is shown and the load can be repeated (F04).
      .catch((err) => { setLead(null); setLoadError(err instanceof Error ? err.message : 'Lead not found.'); })
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-sm text-slate-500 p-6">Loading…</p>;
  if (!lead) return <div className="p-6"><ErrorState title="This lead could not be opened" message={loadError ?? 'Lead not found.'} onRetry={load} /></div>;

  return <LeadDetail id={lead.id} name={lead.name} company={lead.company} status={lead.status} />;
}
