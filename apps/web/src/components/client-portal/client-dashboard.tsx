import Link from 'next/link';
import { ClientSafeNotice } from './client-safe-notice';
import { ClientDashboardSummary } from '@/components/dashboard/client-dashboard-summary';

export function ClientDashboard() {
  return (
    <div className="space-y-6">
      <section aria-labelledby="client-dashboard-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Your client area
        </p>
        <h2 id="client-dashboard-title" className="mt-2 text-3xl font-semibold text-ink">
          Welcome
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Review the work we deliver, tell us what you think, and find your approved files and invoices in one place.
        </p>
        <Link href="/client/deliveries" className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">
          Go to your deliveries
        </Link>
      </section>
      <ClientDashboardSummary />
      <ClientSafeNotice />
    </div>
  );
}
