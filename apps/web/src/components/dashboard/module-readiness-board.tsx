const modules = [
  { label: 'Identity', owner: 'Backend', status: 'Foundation ready', risk: 'Invite-only only' },
  { label: 'Projects', owner: 'Delivery', status: 'MVP skeleton', risk: 'No live DB data' },
  { label: 'CRM', owner: 'Sales', status: 'Pipeline basic', risk: 'Advanced CRM deferred' },
  { label: 'Files', owner: 'Operations', status: 'Metadata only', risk: 'Storage inactive' },
  { label: 'Chat', owner: 'Team', status: 'Internal placeholder', risk: 'Realtime inactive' },
  { label: 'Finance', owner: 'Owner', status: 'Owner-only', risk: 'No payment provider' },
  { label: 'Voice', owner: 'Delivery', status: 'Draft review only', risk: 'AI inactive' },
  { label: 'Reports', owner: 'Owner/Manager', status: 'Privacy guarded', risk: 'No exports' },
];

export function ModuleReadinessBoard() {
  return (
    <section aria-labelledby="module-readiness-title" className="rounded-md border border-line bg-panel p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            MVP modules
          </p>
          <h3 id="module-readiness-title" className="mt-2 text-xl font-semibold text-ink">
            Readiness and current limits
          </h3>
        </div>
        <p className="text-sm text-slate-600">Static preview data until Railway staging is connected.</p>
      </div>
      <div className="mt-4 overflow-x-auto rounded-md border border-line">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[1fr_0.9fr_1fr_1fr] bg-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <span>Module</span>
            <span>Owner</span>
            <span>Status</span>
            <span>Limit</span>
          </div>
          {modules.map((module) => (
            <div
              key={module.label}
              className="grid grid-cols-[1fr_0.9fr_1fr_1fr] border-t border-line bg-white px-4 py-3 text-sm"
            >
              <span className="font-semibold text-ink">{module.label}</span>
              <span className="text-slate-600">{module.owner}</span>
              <span className="text-slate-700">{module.status}</span>
              <span className="text-slate-600">{module.risk}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
