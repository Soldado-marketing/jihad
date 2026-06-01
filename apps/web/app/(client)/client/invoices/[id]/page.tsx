import { ClientSafeNotice } from '@/components/client-portal/client-safe-notice';
import { ClientInvoiceDetail } from '@/components/finance/client-invoice-detail';

export default function ClientInvoiceDetailPage() {
  return (
    <div className="grid gap-6">
      <section aria-labelledby="client-invoice-detail-title">
        <p className="text-sm font-medium text-slate-600">Sprint 9</p>
        <h2 id="client-invoice-detail-title" className="mt-2 text-3xl font-semibold text-ink">
          Invoice Detail
        </h2>
      </section>
      <ClientSafeNotice />
      <ClientInvoiceDetail
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
