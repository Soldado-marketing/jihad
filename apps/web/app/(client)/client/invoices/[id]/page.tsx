'use client';

import { use, useEffect, useState } from 'react';
import { ClientSafeNotice } from '@/components/client-portal/client-safe-notice';
import { ClientInvoiceDetail, type ClientInvoiceDetailData } from '@/components/finance/client-invoice-detail';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/fetch';

type RawInvoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  totalCents: number;
  paidCents: number;
};

function toDetailData(r: RawInvoice): ClientInvoiceDetailData {
  const fmt = (cents: number) => `€${(cents / 100).toFixed(2)}`;
  return {
    number: r.invoiceNumber,
    status: r.status as ClientInvoiceDetailData['status'],
    total: fmt(r.totalCents),
    paid: fmt(r.paidCents),
    outstanding: fmt(Math.max(0, r.totalCents - r.paidCents)),
  };
}

type Props = { params: Promise<{ id: string }> };

export default function ClientInvoiceDetailPage({ params }: Props) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<ClientInvoiceDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<RawInvoice>(`/client/invoices/${id}`)
      .then((data) => setInvoice(toDetailData(data)))
      .catch(() => setInvoice(null))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Client finance view"
        title="Invoice detail"
        description="Invoice summary for your account. Internal cost and margin data are not shown."
      />
      <ClientSafeNotice />
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : invoice ? (
        <ClientInvoiceDetail invoice={invoice} />
      ) : (
        <p className="text-sm text-red-500">Invoice not found or not accessible.</p>
      )}
    </div>
  );
}
