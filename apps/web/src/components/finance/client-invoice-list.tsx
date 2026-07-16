import Link from 'next/link';
import { EmptyState } from '@/components/states/empty-state';
import { InvoiceStatusBadge, type InvoiceStatus } from './invoice-status-badge';

export type ClientInvoiceListItem = {
  id: string;
  number: string;
  amount: string;
  status: InvoiceStatus;
};

export function ClientInvoiceList({ invoices }: { invoices: ClientInvoiceListItem[] }) {
  if (invoices.length === 0) {
    return <EmptyState title="No invoices yet" description="Client-visible invoices will appear after finance persistence is connected." />;
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-lift" aria-label="Client invoice list">
      {invoices.map((invoice) => (
        <li key={invoice.id}>
          <Link
            className="block p-5 hover:bg-slate-50 focus-visible:bg-slate-50"
            href={`/client/invoices/${invoice.id}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-semibold text-ink">{invoice.number}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600">{invoice.amount}</span>
                <InvoiceStatusBadge status={invoice.status} />
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
