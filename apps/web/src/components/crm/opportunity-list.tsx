import Link from 'next/link';
import { EmptyState } from '@/components/states/empty-state';
import { PipelineBadge, type PipelineStatus } from './pipeline-badge';

export type OpportunityListItem = {
  id: string;
  title: string;
  status: PipelineStatus;
  valueLabel?: string;
};

export function OpportunityList({ opportunities }: { opportunities: OpportunityListItem[] }) {
  if (opportunities.length === 0) {
    return (
      <EmptyState
        title="No opportunities yet"
        description="Qualified opportunities will appear after the live CRM API is connected."
      />
    );
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-lift" aria-label="Opportunity list">
      {opportunities.map((opportunity) => (
        <li key={opportunity.id}>
          <Link className="block p-5 hover:bg-slate-50 focus-visible:bg-slate-50" href={`/crm/opportunities/${opportunity.id}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-ink">{opportunity.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{opportunity.valueLabel ?? 'Value not set'}</p>
              </div>
              <PipelineBadge status={opportunity.status} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
