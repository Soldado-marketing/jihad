'use client';

import { use, useEffect, useState } from 'react';
import { ClientSafeNotice } from '@/components/client-portal/client-safe-notice';
import { ClientInvoiceDetail, type ClientInvoiceDetailData } from '@/components/finance/client-invoice-detail';
import { formatCents } from '@/components/finance/invoice-line-editor';
import { PageHeader } from '@/components/ui/page-header';
import { apiBlob, apiFetch, saveBlob } from '@/lib/fetch';

type RawInvoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  currency: string;
  totalCents: number;
  paidCents: number;
};

function toDetailData(r: RawInvoice): ClientInvoiceDetailData {
  // Integer cents formatted without floats, in the invoice's own currency
  // rather than a hardcoded euro sign.
  const fmt = (cents: number) => formatCents(cents, r.currency);
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
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<RawInvoice>(`/client/invoices/${id}`)
      .then((data) => setInvoice(toDetailData(data)))
      .catch(() => setInvoice(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function downloadPdf() {
    setDownloading(true);
    setError(null);
    try {
      // The client PDF route enforces the same visibility boundary as the
      // detail route: an unsent or internal invoice is simply not found.
      const result = await apiBlob(`/client/invoices/${id}/pdf`, 'invoice.pdf');
      saveBlob(result.blob, result.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download the invoice.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Client finance view"
        title="Invoice detail"
        description="Invoice summary for your account. Internal cost and margin data are not shown."
      />
      <ClientSafeNotice />
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : invoice ? (
        <>
          <ClientInvoiceDetail invoice={invoice} />
          <div>
            <button
              type="button"
              onClick={downloadPdf}
              disabled={downloading}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {downloading ? 'Preparing…' : 'Download PDF'}
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm text-red-500">Invoice not found or not accessible.</p>
      )}
    </div>
  );
}
