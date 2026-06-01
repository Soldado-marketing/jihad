import { HiddenDataNotice } from '@/components/dashboard/hidden-data-notice';
import { WorkspaceSummaryGrid } from '@/components/dashboard/workspace-summary-grid';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section aria-labelledby="dashboard-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Sprint 10
        </p>
        <h2 id="dashboard-title" className="mt-2 text-3xl font-semibold text-ink">
          Workspace dashboard
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Basic delivery, CRM, collaboration, file, approval, voice, and owner-only finance
          summaries for the MVP workspace.
        </p>
      </section>
      <HiddenDataNotice />
      <WorkspaceSummaryGrid />
    </div>
  );
}
