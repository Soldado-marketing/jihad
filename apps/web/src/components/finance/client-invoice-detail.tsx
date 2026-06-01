import { InvoiceStatusBadge, type InvoiceStatus } from './invoice-status-badge';

export type ClientInvoiceDetailData = {
  number: string;
  status: InvoiceStatus;
  total: string;
  paid: string;
  outstanding: string;
};

export function ClientInvoiceDetail({ invoice }: { invoice: ClientInvoiceDetailData }) {
  return (
    <section aria-label="Client invoice detail" className="rounded-md border border-line bg-panel p-5">
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
    </section>
  );
}
