import { PipelineBadge, type PipelineStatus } from './pipeline-badge';

export function LeadDetail({
  company,
  id,
  name,
  status,
}: {
  company?: string;
  id: string;
  name: string;
  status: PipelineStatus;
}) {
  return (
    <section aria-labelledby="lead-detail-title" className="rounded-md border border-line bg-panel p-6 shadow-shell">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">Lead</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h2 id="lead-detail-title" className="text-3xl font-semibold text-ink">
          {name}
        </h2>
        <PipelineBadge status={status} />
      </div>
      <p className="mt-2 text-sm text-slate-600">Reference: {id}</p>
      <p className="mt-2 text-sm text-slate-600">Company: {company ?? 'Not set'}</p>
    </section>
  );
}
