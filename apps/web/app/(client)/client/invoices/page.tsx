'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ClientSafeNotice } from '@/components/client-portal/client-safe-notice';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiFetch } from '@/lib/fetch';
import { type ClientInvoice, INVOICE_STATUS_LABEL, money, remainingCents } from '@/lib/client-portal';

/** Invoices: what each one costs, what has been paid and confirmed, and what is still open. */
export default function ClientInvoicesPage() {
  const [items, setItems] = useState<ClientInvoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<ClientInvoice[]>('/client/invoices')
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load your invoices.'));
  }, []);

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Invoices" title="Invoices and payments" description="Each invoice with the payments we have confirmed and the amount still open." />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {items === null && !error && <p className="text-sm text-slate-500">Loading…</p>}
      {items?.length === 0 && <p className="rounded-xl border border-line bg-white p-8 text-center text-sm text-muted">No invoices yet.</p>}
      <ul className="grid gap-3">
        {items?.map((i) => (
          <li key={i.id}>
            <Link href={`/client/invoices/${i.id}`} className="grid gap-3 rounded-xl border border-line bg-white p-5 hover:bg-slate-50 sm:grid-cols-[1fr_auto]">
              <span className="min-w-0">
                <span className="block font-medium text-ink">Invoice {i.invoiceNumber}</span>
                <span className="block text-xs text-muted">
                  {i.project?.name ? `${i.project.name} · ` : ''}{i.dueAt ? `Due ${new Date(i.dueAt).toLocaleDateString()}` : i.issuedAt ? `Issued ${new Date(i.issuedAt).toLocaleDateString()}` : ''}
                </span>
                <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
                  <span>Total {money(i.totalCents, i.currency)}</span>
                  <span>Paid {money(i.paidCents, i.currency)}</span>
                  <span className="font-semibold text-ink">Open {money(remainingCents(i), i.currency)}</span>
                </span>
              </span>
              <span className="self-start"><StatusBadge status={i.status} label={INVOICE_STATUS_LABEL[i.status]} /></span>
            </Link>
          </li>
        ))}
      </ul>
      <ClientSafeNotice />
    </div>
  );
}
