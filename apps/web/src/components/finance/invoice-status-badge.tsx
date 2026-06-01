import { cn } from '@/lib/class-names';

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOID';

const labels: Record<InvoiceStatus, string> = {
  DRAFT: 'Draft',
  OVERDUE: 'Overdue',
  PAID: 'Paid',
  PARTIALLY_PAID: 'Partially paid',
  SENT: 'Sent',
  VOID: 'Void',
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-md border px-2 py-1 text-xs font-semibold',
        status === 'PAID' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
        status === 'PARTIALLY_PAID' && 'border-amber-200 bg-amber-50 text-amber-700',
        status === 'OVERDUE' && 'border-red-200 bg-red-50 text-red-700',
        status !== 'PAID' &&
          status !== 'PARTIALLY_PAID' &&
          status !== 'OVERDUE' &&
          'border-line bg-slate-50 text-slate-700',
      )}
    >
      {labels[status]}
    </span>
  );
}
