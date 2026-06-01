import { OwnerOnlyFinanceNotice } from '@/components/finance/owner-only-finance-notice';
import { PaymentList, type PaymentListItem } from '@/components/finance/payment-list';

const sprint9Payments: PaymentListItem[] = [
  {
    amount: '€1,250.00',
    id: 'sprint-9-payment-placeholder',
    invoiceNumber: 'INV-S9-001',
    status: 'PARTIAL',
  },
];

export default function PaymentsPage() {
  return (
    <div className="grid gap-6">
      <section aria-labelledby="payments-title">
        <p className="text-sm font-medium text-slate-600">Sprint 9</p>
        <h2 id="payments-title" className="mt-2 text-3xl font-semibold text-ink">
          Payments
        </h2>
      </section>
      <OwnerOnlyFinanceNotice />
      <PaymentList payments={sprint9Payments} />
    </div>
  );
}
