'use client';

import { use, useEffect, useState } from 'react';
import { LeadDetail } from '@/components/crm/lead-detail';
import { type PipelineStatus } from '@/components/crm/pipeline-badge';
import { apiFetch } from '@/lib/fetch';

type Lead = { id: string; name: string; company?: string; status: PipelineStatus };

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Lead>(`/leads/${id}`)
      .then(setLead)
      .catch(() => setLead(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-sm text-slate-500 p-6">Loading…</p>;
  if (!lead) return <p className="text-sm text-red-500 p-6">Lead not found.</p>;

  return <LeadDetail id={lead.id} name={lead.name} company={lead.company} status={lead.status} />;
}
