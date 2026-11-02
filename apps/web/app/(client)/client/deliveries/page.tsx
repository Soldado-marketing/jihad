'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ClientSafeNotice } from '@/components/client-portal/client-safe-notice';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiFetch } from '@/lib/fetch';
import { DELIVERY_STATUS_LABEL } from '@/lib/deliveries';

type Delivery = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  versionNumber: number | null;
  project: { id: string; name: string } | null;
};

/** Work delivered to the client for review: open each one to view, approve or ask for changes. */
export default function ClientDeliveriesPage() {
  const [items, setItems] = useState<Delivery[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Delivery[]>('/client/deliveries')
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load your deliveries.'));
  }, []);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Review"
        title="Deliveries"
        description="Work delivered for your review. Approve it, or tell us what to change."
      />
      <ClientSafeNotice />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {items === null && !error && <p className="text-sm text-slate-500">Loading…</p>}
      {items?.length === 0 && (
        <p className="rounded-xl border border-line bg-white p-8 text-center text-sm text-muted">Nothing is waiting for your review.</p>
      )}
      <ul className="grid gap-3">
        {items?.map((d) => (
          <li key={d.id}>
            <Link href={`/client/deliveries/${d.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-5 hover:bg-slate-50">
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">{d.title}</span>
                <span className="mt-0.5 block text-xs text-muted">
                  {d.project?.name ?? 'No project'}{d.versionNumber ? ` · Version ${d.versionNumber}` : ''} · {new Date(d.updatedAt).toLocaleDateString()}
                </span>
              </span>
              <StatusBadge status={d.status} label={DELIVERY_STATUS_LABEL[d.status]} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
