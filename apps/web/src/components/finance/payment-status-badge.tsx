import { cn } from '@/lib/class-names';

export type PaymentStatus =
  | 'PENDING'
  | 'RECORDED'
  | 'PARTIAL'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED'
  | 'CANCELED';

const labels: Record<PaymentStatus, string> = {
  CANCELED: 'Canceled',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  PARTIAL: 'Partial',
  PENDING: 'Pending',
  RECORDED: 'Recorded',
  REFUNDED: 'Refunded',
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-md border px-2 py-1 text-xs font-semibold',
        status === 'COMPLETED' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
        status === 'PARTIAL' && 'border-amber-200 bg-amber-50 text-amber-700',
        status === 'FAILED' && 'border-red-200 bg-red-50 text-red-700',
        status !== 'COMPLETED' &&
          status !== 'PARTIAL' &&
          status !== 'FAILED' &&
          'border-line bg-slate-50 text-slate-700',
      )}
    >
      {labels[status]}
    </span>
  );
}
