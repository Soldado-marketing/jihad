import { InvoiceList, type InvoiceListItem } from '@/components/finance/invoice-list';
import { OwnerOnlyFinanceNotice } from '@/components/finance/owner-only-finance-notice';

const sprint9Invoices: InvoiceListItem[] = [
  {
    amount: '€2,500.00',
    id: 'sprint-9-invoice-placeholder',
    number: 'INV-S9-001',
    status: 'PARTIALLY_PAID',
  },
];

export default function InvoicesPage() {
  return (
    <div className="grid gap-6">
      <section aria-labelledby="invoices-title">
        <p className="text-sm font-medium text-slate-600">Sprint 9</p>
        <h2 id="invoices-title" className="mt-2 text-3xl font-semibold text-ink">
          Invoices
        </h2>
      </section>
      <OwnerOnlyFinanceNotice />
      <InvoiceList invoices={sprint9Invoices} />
    </div>
  );
}
