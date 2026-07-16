'use client';

import { useEffect, useState } from 'react';
import { SummaryCard } from './summary-card';
import { HiddenDataNotice } from './hidden-data-notice';
import { apiFetch } from '@/lib/fetch';

type ClientSummary = { projects: number; tasks: number; invoices: number };

export function ClientDashboardSummary() {
  const [data, setData] = useState<ClientSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<ClientSummary>('/dashboards/client-summary')
      .then(setData)
      .catch(() => setData({ projects: 0, tasks: 0, invoices: 0 }))
      .finally(() => setLoading(false));
  }, []);

  const str = (n: number | undefined) => (loading ? '…' : String(n ?? 0));

  return (
    <div className="grid gap-4">
      <section aria-label="Client summary" className="grid gap-3 md:grid-cols-3">
        <SummaryCard detail="Client-visible project records." label="Projects" value={str(data?.projects)} />
        <SummaryCard detail="Client-visible task records." label="Tasks" value={str(data?.tasks)} />
        <SummaryCard detail="Client-visible invoice records." label="Invoices" value={str(data?.invoices)} />
      </section>
      <HiddenDataNotice />
    </div>
  );
}
