import { ClientInvoiceList, type ClientInvoiceListItem } from '@/components/finance/client-invoice-list';
import { ClientSafeNotice } from '@/components/client-portal/client-safe-notice';

const clientInvoices: ClientInvoiceListItem[] = [
  {
    amount: '€2,500.00',
    id: 'sprint-9-invoice-placeholder',
    number: 'INV-S9-001',
    status: 'PARTIALLY_PAID',
  },
];

export default function ClientInvoicesPage() {
  return (
    <div className="grid gap-6">
      <section aria-labelledby="client-invoices-title">
        <p className="text-sm font-medium text-slate-600">Sprint 9</p>
        <h2 id="client-invoices-title" className="mt-2 text-3xl font-semibold text-ink">
          Invoices
        </h2>
      </section>
      <ClientSafeNotice />
      <ClientInvoiceList invoices={clientInvoices} />
    </div>
  );
}
