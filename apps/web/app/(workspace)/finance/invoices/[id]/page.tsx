'use client';

import { use, useEffect, useState } from 'react';
import { InvoiceDetail, type InvoiceDetailData } from '@/components/finance/invoice-detail';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/fetch';

type RawInvoice = {
  id: string;
  invoiceNumber: string;
  status: InvoiceDetailData['status'];
  totalCents: number;
  paidCents: number;
};

function toDetailData(r: RawInvoice): InvoiceDetailData {
  const fmt = (cents: number) => `€${(cents / 100).toFixed(2)}`;
  return {
    number: r.invoiceNumber,
    status: r.status,
    total: fmt(r.totalCents),
    paid: fmt(r.paidCents),
    outstanding: fmt(Math.max(0, r.totalCents - r.paidCents)),
  };
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<InvoiceDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<RawInvoice>(`/invoices/${id}`)
      .then((data) => setInvoice(toDetailData(data)))
      .catch(() => setInvoice(null))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Owner-only finance"
        title="Invoice detail"
        description="Invoice details are restricted to the owner workspace. Client-safe invoice views use a separate route."
      />
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : invoice ? (
        <InvoiceDetail invoice={invoice} />
      ) : (
        <p className="text-sm text-red-500">Invoice not found.</p>
      )}
    </div>
  );
}
