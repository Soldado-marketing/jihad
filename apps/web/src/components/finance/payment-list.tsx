import { EmptyState } from '@/components/states/empty-state';
import { PaymentStatusBadge, type PaymentStatus } from './payment-status-badge';

export type PaymentListItem = {
  id: string;
  invoiceNumber: string;
  amount: string;
  status: PaymentStatus;
};

export function PaymentList({ payments }: { payments: PaymentListItem[] }) {
  if (payments.length === 0) {
    return <EmptyState title="No payments yet" description="Manual payment records will appear after live finance data is connected." />;
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-lift" aria-label="Payment list">
      {payments.map((payment) => (
        <li className="flex flex-wrap items-center justify-between gap-3 p-5" key={payment.id}>
          <div>
            <h3 className="font-semibold text-ink">{payment.invoiceNumber}</h3>
            <p className="mt-1 text-sm text-slate-600">{payment.amount}</p>
          </div>
          <PaymentStatusBadge status={payment.status} />
        </li>
      ))}
    </ul>
  );
}
