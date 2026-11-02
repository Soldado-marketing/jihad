'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiFetch } from '@/lib/fetch';
import { DELIVERY_STATUS_LABEL } from '@/lib/deliveries';
import { ClientSafeNotice } from './client-safe-notice';

type ClientProjectDetailProps = {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
};

type Delivery = { id: string; title: string; status: string; versionNumber: number | null; project: { id: string } | null };

const PROJECT_STATUS: Record<ClientProjectDetailProps['status'], string> = { ACTIVE: 'In progress', PAUSED: 'Paused', ARCHIVED: 'Completed' };

/** One project: its status and the deliveries shared for it. Internal tasks are never shown. */
export function ClientProjectDetail({ id, name, status }: ClientProjectDetailProps) {
  const [deliveries, setDeliveries] = useState<Delivery[] | null>(null);

  useEffect(() => {
    apiFetch<Delivery[]>('/client/deliveries')
      .then((rows) => setDeliveries(rows.filter((d) => d.project?.id === id)))
      .catch(() => setDeliveries([]));
  }, [id]);

  return (
    <div className="space-y-6">
      <section aria-labelledby="client-project-title" className="rounded-md border border-line bg-panel p-6 shadow-shell">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Project</p>
        <h2 id="client-project-title" className="mt-2 text-3xl font-semibold text-ink">
          {name}
        </h2>
        <p className="mt-2 text-sm text-slate-600">Status: {PROJECT_STATUS[status] ?? status}</p>
      </section>

      <section aria-labelledby="project-deliveries" className="rounded-md border border-line bg-panel p-6">
        <h3 id="project-deliveries" className="font-semibold text-ink">Deliveries</h3>
        {deliveries === null && <p className="mt-2 text-sm text-slate-500">Loading…</p>}
        {deliveries?.length === 0 && <p className="mt-2 text-sm text-slate-600">Nothing has been delivered for this project yet.</p>}
        <ul className="mt-3 divide-y divide-line">
          {deliveries?.map((d) => (
            <li key={d.id}>
              <Link href={`/client/deliveries/${d.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm hover:underline">
                <span className="text-ink">{d.title}{d.versionNumber ? ` · Version ${d.versionNumber}` : ''}</span>
                <StatusBadge status={d.status} label={DELIVERY_STATUS_LABEL[d.status]} />
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <ClientSafeNotice />
    </div>
  );
}
