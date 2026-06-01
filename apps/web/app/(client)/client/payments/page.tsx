import { ClientSafeNotice } from '@/components/client-portal/client-safe-notice';
import { ClientPaymentList, type ClientPaymentListItem } from '@/components/finance/client-payment-list';

const clientPayments: ClientPaymentListItem[] = [
  {
    amount: '€1,250.00',
    id: 'sprint-9-payment-placeholder',
    invoiceNumber: 'INV-S9-001',
    status: 'PARTIAL',
  },
];

export default function ClientPaymentsPage() {
  return (
    <div className="grid gap-6">
      <section aria-labelledby="client-payments-title">
        <p className="text-sm font-medium text-slate-600">Sprint 9</p>
        <h2 id="client-payments-title" className="mt-2 text-3xl font-semibold text-ink">
          Payments
        </h2>
      </section>
      <ClientSafeNotice />
      <ClientPaymentList payments={clientPayments} />
    </div>
  );
}
