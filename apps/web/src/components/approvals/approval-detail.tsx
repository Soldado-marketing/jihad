import { ApprovalDecisionPanel } from './approval-decision-panel';
import { ApprovalStatusBadge, type ApprovalStatus } from './approval-status-badge';

export function ApprovalDetail({
  id,
  status,
  title,
}: {
  id: string;
  status: ApprovalStatus;
  title: string;
}) {
  return (
    <div className="space-y-6">
      <section aria-labelledby="approval-detail-title" className="rounded-2xl border border-line bg-white p-6 shadow-lift">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Approval</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 id="approval-detail-title" className="text-3xl font-semibold text-ink">
            {title}
          </h2>
          <ApprovalStatusBadge status={status} />
        </div>
        <p className="mt-2 text-sm text-slate-600">Reference: {id}</p>
      </section>
      <ApprovalDecisionPanel />
    </div>
  );
}
