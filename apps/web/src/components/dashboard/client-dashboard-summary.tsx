'use client';

import { useEffect, useState } from 'react';
import { SummaryCard } from './summary-card';
import { apiFetch } from '@/lib/fetch';

type Counts = { waiting: number; projects: number; invoices: number };

/**
 * The client's starting point: what waits for their review, their projects and
 * invoices. Every count comes from a client-scoped /client route, so it only
 * ever counts the caller's own records.
 */
export function ClientDashboardSummary() {
  const [data, setData] = useState<Counts | null>(null);

  useEffect(() => {
    const count = (path: string, keep: (row: { status?: string }) => boolean = () => true) =>
      apiFetch<{ status?: string }[]>(path).then((rows) => (Array.isArray(rows) ? rows.filter(keep).length : 0)).catch(() => 0);
    void Promise.all([
      count('/client/deliveries', (d) => d.status === 'REQUESTED'),
      count('/client/projects'),
      count('/client/invoices'),
    ]).then(([waiting, projects, invoices]) => setData({ waiting, projects, invoices }));
  }, []);

  const str = (n: number | undefined) => (data ? String(n ?? 0) : '…');

  return (
    <section aria-label="Overview" className="grid gap-3 md:grid-cols-3">
      <SummaryCard label="Waiting for your review" value={str(data?.waiting)} detail="Deliveries you can approve or comment on." />
      <SummaryCard label="Projects" value={str(data?.projects)} detail="Projects we are working on for you." />
      <SummaryCard label="Invoices" value={str(data?.invoices)} detail="Invoices issued to your company." />
    </section>
  );
}
