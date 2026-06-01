import { PipelineBadge, type PipelineStatus } from './pipeline-badge';

export function OpportunityDetail({
  id,
  status,
  title,
  valueLabel,
}: {
  id: string;
  status: PipelineStatus;
  title: string;
  valueLabel?: string;
}) {
  return (
    <section aria-labelledby="opportunity-detail-title" className="rounded-md border border-line bg-panel p-6 shadow-shell">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">Opportunity</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h2 id="opportunity-detail-title" className="text-3xl font-semibold text-ink">
          {title}
        </h2>
        <PipelineBadge status={status} />
      </div>
      <p className="mt-2 text-sm text-slate-600">Reference: {id}</p>
      <p className="mt-2 text-sm text-slate-600">Value: {valueLabel ?? 'Not set'}</p>
    </section>
  );
}
