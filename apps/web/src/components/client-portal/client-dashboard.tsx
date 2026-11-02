import Link from 'next/link';
import { ClientDashboardSummary } from '@/components/dashboard/client-dashboard-summary';

export function ClientDashboard() {
  return (
    <div className="space-y-6">
      <section aria-labelledby="client-dashboard-title">
        <h2 id="client-dashboard-title" className="text-3xl font-semibold text-ink">
          Welcome
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Review the work we deliver, follow your invoices and see your next shooting, all in one place.
        </p>
        <p className="mt-3 text-sm text-slate-600">
          Something wrong? <Link href="/client/problems?new=1" className="font-medium text-brand hover:underline">Report a problem</Link> and our management will answer you.
        </p>
      </section>
      <ClientDashboardSummary />
    </div>
  );
}
