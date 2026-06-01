import { InvoiceDetail } from '@/components/finance/invoice-detail';

export default function InvoiceDetailPage() {
  return (
    <div className="grid gap-6">
      <section aria-labelledby="invoice-detail-title">
        <p className="text-sm font-medium text-slate-600">Sprint 9</p>
        <h2 id="invoice-detail-title" className="mt-2 text-3xl font-semibold text-ink">
          Invoice Detail
        </h2>
      </section>
      <InvoiceDetail
        invoice={{
          number: 'INV-S9-001',
          outstanding: '€1,250.00',
          paid: '€1,250.00',
          status: 'PARTIALLY_PAID',
          total: '€2,500.00',
        }}
      />
    </div>
  );
}
