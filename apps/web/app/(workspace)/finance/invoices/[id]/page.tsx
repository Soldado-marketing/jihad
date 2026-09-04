'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { InvoiceDetail, type InvoiceDetailData } from '@/components/finance/invoice-detail';
import { formatCents, toCents } from '@/components/finance/invoice-line-editor';
import { PageHeader } from '@/components/ui/page-header';
import { apiBlob, apiFetch, saveBlob } from '@/lib/fetch';

type Line = {
  id: string;
  description: string;
  quantity: number;
  unitAmountCents: number;
  totalAmountCents: number;
};
type Payment = {
  id: string;
  amountCents: number;
  method: string;
  status: string;
  receivedAt?: string | null;
};
type RawInvoice = {
  id: string;
  invoiceNumber: string;
  status: InvoiceDetailData['status'];
  currency: string;
  subtotalCents: number;
  totalCents: number;
  paidCents: number;
  issuedAt?: string | null;
  dueAt?: string | null;
  lines?: Line[];
  payments?: Payment[];
};

function toDetailData(r: RawInvoice): InvoiceDetailData {
  return {
    number: r.invoiceNumber,
    status: r.status,
    total: formatCents(r.totalCents, r.currency),
    paid: formatCents(r.paidCents, r.currency),
    outstanding: formatCents(Math.max(0, r.totalCents - r.paidCents), r.currency),
  };
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<RawInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [recipients, setRecipients] = useState('');
  const [payment, setPayment] = useState({ amount: '', method: 'BANK_TRANSFER' });

  const load = useCallback(
    () =>
      apiFetch<RawInvoice>(`/invoices/${id}`)
        .then(setInvoice)
        .catch(() => setInvoice(null))
        .finally(() => setLoading(false)),
    [id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function downloadPdf() {
    setBusy('pdf');
    setError(null);
    try {
      const result = await apiBlob(`/invoices/${id}/pdf`, 'invoice.pdf');
      saveBlob(result.blob, result.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download the PDF.');
    } finally {
      setBusy(null);
    }
  }

  async function sendInvoice() {
    setBusy('send');
    setError(null);
    setNotice(null);
    try {
      // With no recipients the API addresses the CLIENT members of the
      // invoice's project.
      const list = recipients
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);
      const result = await apiFetch<{ recipientCount: number }>(`/invoices/${id}/send`, {
        method: 'POST',
        body: JSON.stringify(list.length > 0 ? { recipients: list } : {}),
      });
      setNotice(`Invoice sent to ${result.recipientCount} recipient(s).`);
      setRecipients('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the invoice.');
    } finally {
      setBusy(null);
    }
  }

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!invoice) return;
    const cents = toCents(payment.amount);
    if (cents === null || cents <= 0) {
      setError('Enter a positive amount with at most 2 decimals.');
      return;
    }

    setBusy('payment');
    setError(null);
    setNotice(null);
    try {
      await apiFetch('/payments', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: id,
          amountCents: cents,
          currency: invoice.currency,
          method: payment.method,
        }),
      });
      setNotice('Payment recorded.');
      setPayment({ amount: '', method: 'BANK_TRANSFER' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record the payment.');
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="p-6 text-sm text-slate-500">Loading…</p>;
  if (!invoice) return <p className="p-6 text-sm text-red-500">Invoice not found.</p>;

  const outstanding = Math.max(0, invoice.totalCents - invoice.paidCents);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Owner-only finance"
        title="Invoice detail"
        description="Invoice details are restricted to the owner workspace. Client-safe invoice views use a separate route."
      />

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {notice && <p className="text-sm text-green-700">{notice}</p>}

      <InvoiceDetail invoice={toDetailData(invoice)} />

      <section className="rounded-2xl border border-line bg-white p-6 shadow-lift">
        <h3 className="font-semibold text-ink">Line items</h3>
        {(invoice.lines ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted">This invoice has no line items, so its total is zero.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2">Description</th>
                <th className="pb-2 text-right">Qty</th>
                <th className="pb-2 text-right">Unit</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(invoice.lines ?? []).map((line) => (
                <tr key={line.id}>
                  <td className="py-2">{line.description}</td>
                  <td className="py-2 text-right tabular-nums">{line.quantity}</td>
                  <td className="py-2 text-right tabular-nums">
                    {formatCents(line.unitAmountCents, invoice.currency)}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {formatCents(line.totalAmountCents, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-white p-6 shadow-lift">
        <h3 className="font-semibold text-ink">Delivery</h3>
        <p className="mt-1 text-sm text-slate-600">
          {invoice.issuedAt
            ? `Issued ${new Date(invoice.issuedAt).toLocaleDateString()} · status ${invoice.status}`
            : 'Not issued yet. Sending the invoice marks it as issued and makes it visible to the client.'}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={downloadPdf}
            disabled={busy !== null}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-slate-50 disabled:opacity-50"
          >
            {busy === 'pdf' ? 'Preparing…' : 'Download PDF'}
          </button>
          <input
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            placeholder="Recipients (optional, comma separated)"
            aria-label="Recipients"
            className="min-w-[16rem] flex-1 rounded-lg border border-line px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={sendInvoice}
            disabled={busy !== null || invoice.status === 'VOID'}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy === 'send' ? 'Sending…' : invoice.issuedAt ? 'Re-send invoice' : 'Send invoice'}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-6 shadow-lift">
        <h3 className="font-semibold text-ink">Payments</h3>
        <p className="mt-1 text-sm text-slate-600">
          Outstanding: {formatCents(outstanding, invoice.currency)}
        </p>

        <form onSubmit={recordPayment} className="mt-4 flex flex-wrap items-center gap-3">
          <input
            value={payment.amount}
            onChange={(e) =>
              setPayment({ ...payment, amount: e.target.value.replace(/[^0-9.]/g, '') })
            }
            inputMode="decimal"
            placeholder={`Amount (${invoice.currency})`}
            aria-label="Payment amount"
            className="rounded-lg border border-line px-3 py-2 text-sm"
          />
          <select
            value={payment.method}
            onChange={(e) => setPayment({ ...payment, method: e.target.value })}
            aria-label="Payment method"
            className="rounded-lg border border-line px-3 py-2 text-sm"
          >
            {['BANK_TRANSFER', 'CASH', 'CARD', 'MANUAL', 'OTHER'].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy !== null}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy === 'payment' ? 'Recording…' : 'Record payment'}
          </button>
        </form>

        {(invoice.payments ?? []).length > 0 && (
          <ul className="mt-4 divide-y divide-line border-t border-line">
            {(invoice.payments ?? []).map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span className="tabular-nums">{formatCents(p.amountCents, invoice.currency)}</span>
                <span className="text-slate-600">
                  {p.method} · {p.status}
                  {p.receivedAt ? ` · ${new Date(p.receivedAt).toLocaleDateString()}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
