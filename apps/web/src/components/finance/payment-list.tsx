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
    return <EmptyState title="No payments" description="Manual payment records appear here." />;
  }

  return (
    <ul className="divide-y divide-line rounded-md border border-line bg-panel" aria-label="Payment list">
      {payments.map((payment) => (
        <li className="flex flex-wrap items-center justify-between gap-3 p-4" key={payment.id}>
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
