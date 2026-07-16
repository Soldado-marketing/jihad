'use client';

import { useEffect, useState } from 'react';
import { ClientInvoiceList, type ClientInvoiceListItem } from '@/components/finance/client-invoice-list';
import { ClientSafeNotice } from '@/components/client-portal/client-safe-notice';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/fetch';

type RawInvoice = { id: string; invoiceNumber: string; totalCents: number; status: string };

function toListItem(r: RawInvoice): ClientInvoiceListItem {
  return {
    id: r.id,
    number: r.invoiceNumber,
    amount: `€${(r.totalCents / 100).toFixed(2)}`,
    status: r.status as ClientInvoiceListItem['status'],
  };
}

export default function ClientInvoicesPage() {
  const [invoices, setInvoices] = useState<ClientInvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<RawInvoice[]>('/client/invoices')
      .then((data) => setInvoices(data.map(toListItem)))
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Client finance view"
        title="Invoices"
        description="Your invoice records. Margin and restricted finance details remain hidden."
      />
      <ClientSafeNotice />
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <ClientInvoiceList invoices={invoices} />
      )}
    </div>
  );
}
