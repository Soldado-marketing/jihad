import { ClientSafeNotice } from './client-safe-notice';
import { ClientDashboardSummary } from '@/components/dashboard/client-dashboard-summary';

export function ClientDashboard() {
  return (
    <div className="space-y-6">
      <section aria-labelledby="client-dashboard-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Portal foundation
        </p>
        <h2 id="client-dashboard-title" className="mt-2 text-3xl font-semibold text-ink">
          Welcome
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          View approved project, task, and invoice placeholders prepared for your account.
        </p>
      </section>
      <ClientSafeNotice />
      <ClientDashboardSummary />
    </div>
  );
}
