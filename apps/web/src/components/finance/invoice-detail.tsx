import { InvoiceStatusBadge, type InvoiceStatus } from './invoice-status-badge';
import { OwnerOnlyFinanceNotice } from './owner-only-finance-notice';

export type InvoiceDetailData = {
  number: string;
  status: InvoiceStatus;
  total: string;
  paid: string;
  outstanding: string;
};

export function InvoiceDetail({ invoice }: { invoice: InvoiceDetailData }) {
  return (
    <section aria-label="Invoice detail" className="grid gap-4">
      <OwnerOnlyFinanceNotice />
      <div className="rounded-2xl border border-line bg-white p-6 shadow-lift">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-semibold text-ink">{invoice.number}</h3>
          <InvoiceStatusBadge status={invoice.status} />
        </div>
        <dl className="mt-5 grid gap-3 text-sm md:grid-cols-3">
          <div>
            <dt className="text-slate-600">Total</dt>
            <dd className="mt-1 font-semibold text-ink">{invoice.total}</dd>
          </div>
          <div>
            <dt className="text-slate-600">Paid</dt>
            <dd className="mt-1 font-semibold text-ink">{invoice.paid}</dd>
          </div>
          <div>
            <dt className="text-slate-600">Outstanding</dt>
            <dd className="mt-1 font-semibold text-ink">{invoice.outstanding}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
