import { HiddenDataNotice } from '@/components/dashboard/hidden-data-notice';
import { ModuleReadinessBoard } from '@/components/dashboard/module-readiness-board';
import { WorkspaceCommandCenter } from '@/components/dashboard/workspace-command-center';
import { WorkspaceSummaryGrid } from '@/components/dashboard/workspace-summary-grid';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section aria-labelledby="dashboard-title">
        <div className="rounded-md border border-line bg-panel p-6 shadow-shell">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            MAOS MVP preview
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="dashboard-title" className="text-3xl font-semibold text-ink">
                Workspace dashboard
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                A fuller local preview for delivery, CRM, collaboration, files, approvals,
                voice, owner-only finance, and reports. Live data starts after API,
                PostgreSQL, and Railway staging are connected.
              </p>
            </div>
            <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <span className="font-semibold">Preview mode:</span> static MVP data
            </div>
          </div>
        </div>
      </section>
      <WorkspaceCommandCenter />
      <HiddenDataNotice />
      <WorkspaceSummaryGrid />
      <ModuleReadinessBoard />
    </div>
  );
}
