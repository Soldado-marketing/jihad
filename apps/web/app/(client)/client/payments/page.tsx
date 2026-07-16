'use client';

import { useEffect, useState } from 'react';
import { ClientPaymentList, type ClientPaymentListItem } from '@/components/finance/client-payment-list';
import { ClientSafeNotice } from '@/components/client-portal/client-safe-notice';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/fetch';

type RawPayment = { id: string; amountCents: number; status: string; invoice?: { invoiceNumber: string } };

function toListItem(r: RawPayment): ClientPaymentListItem {
  return {
    id: r.id,
    invoiceNumber: r.invoice?.invoiceNumber ?? '—',
    amount: `€${(r.amountCents / 100).toFixed(2)}`,
    status: r.status as ClientPaymentListItem['status'],
  };
}

export default function ClientPaymentsPage() {
  const [payments, setPayments] = useState<ClientPaymentListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<RawPayment[]>('/client/payments')
      .then((data) => setPayments(data.map(toListItem)))
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Client finance view"
        title="Payments"
        description="Payment summaries for invoices linked to your account."
      />
      <ClientSafeNotice />
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <ClientPaymentList payments={payments} />
      )}
    </div>
  );
}
