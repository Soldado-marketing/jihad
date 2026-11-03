'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { ClientSafeNotice } from '@/components/client-portal/client-safe-notice';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiBlob, apiFetch, saveBlob } from '@/lib/fetch';
import { type ClientInvoice, countedPayment, INVOICE_STATUS_LABEL, money, remainingCents } from '@/lib/client-portal';

type Payment = { id: string; amountCents: number; receivedAt: string | null; status: string };
type Detail = ClientInvoice & { payments?: Payment[] };

type Props = { params: Promise<{ id: string }> };

/** One invoice: totals, every confirmed (partial) payment, the open balance and the PDF. */
export default function ClientInvoiceDetailPage({ params }: Props) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Detail>(`/client/invoices/${id}`)
      .then(setInvoice)
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

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!invoice) return <p className="text-sm text-red-600">Invoice not found.</p>;
  const payments = (invoice.payments ?? []).filter((p) => countedPayment(p.status));

  return (
    <div className="grid gap-6">
      <Link href="/client/invoices" className="text-sm text-brand hover:underline">← Invoices</Link>
      <PageHeader eyebrow="Invoice" title={`Invoice ${invoice.invoiceNumber}`} description={invoice.dueAt ? `Due ${new Date(invoice.dueAt).toLocaleDateString()}` : 'Invoice details and PDF.'} />
      <section className="grid gap-3 rounded-xl border border-line bg-white p-5 sm:grid-cols-4">
        <Figure label="Total" value={money(invoice.totalCents, invoice.currency)} />
        <Figure label="Paid" value={money(invoice.paidCents, invoice.currency)} />
        <Figure label="Open" value={money(remainingCents(invoice), invoice.currency)} strong />
        <div className="flex items-center sm:justify-end"><StatusBadge status={invoice.status} label={INVOICE_STATUS_LABEL[invoice.status]} /></div>
      </section>
      <section aria-labelledby="payments-title" className="rounded-xl border border-line bg-white p-5">
        <h2 id="payments-title" className="font-semibold text-ink">Payments received</h2>
        {payments.length === 0 && <p className="mt-2 text-sm text-slate-600">No payment has been confirmed for this invoice yet.</p>}
        <ul className="mt-2 divide-y divide-line text-sm">
          {payments.map((p) => (
            <li key={p.id} className="flex justify-between gap-3 py-2">
              <span>{p.receivedAt ? new Date(p.receivedAt).toLocaleDateString() : 'Date not set'}</span>
              <span className="font-medium text-ink">{money(p.amountCents, invoice.currency)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">Payments appear here once our team has confirmed them.</p>
      </section>
      <div>
        <button type="button" onClick={() => void downloadPdf()} disabled={downloading} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {downloading ? 'Preparing…' : 'Download PDF'}
        </button>
        {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
      <ClientSafeNotice />
    </div>
  );
}

function Figure({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-lg ${strong ? 'font-semibold text-ink' : 'text-slate-700'}`}>{value}</p>
    </div>
  );
}
