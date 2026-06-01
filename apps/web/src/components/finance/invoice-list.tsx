import Link from 'next/link';
import { EmptyState } from '@/components/states/empty-state';
import { InvoiceStatusBadge, type InvoiceStatus } from './invoice-status-badge';

export type InvoiceListItem = {
  id: string;
  number: string;
  amount: string;
  status: InvoiceStatus;
};

export function InvoiceList({ invoices }: { invoices: InvoiceListItem[] }) {
  if (invoices.length === 0) {
    return <EmptyState title="No invoices" description="Basic invoice placeholders appear here." />;
  }

  return (
    <ul className="divide-y divide-line rounded-md border border-line bg-panel" aria-label="Invoice list">
      {invoices.map((invoice) => (
        <li key={invoice.id}>
          <Link
            className="block p-4 hover:bg-slate-50 focus-visible:bg-slate-50"
            href={`/finance/invoices/${invoice.id}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-ink">{invoice.number}</h3>
                <p className="mt-1 text-sm text-slate-600">{invoice.amount}</p>
              </div>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
