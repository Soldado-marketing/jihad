import Link from 'next/link';
import { EmptyState } from '@/components/states/empty-state';
import { PipelineBadge, type PipelineStatus } from './pipeline-badge';

export type LeadListItem = {
  id: string;
  name: string;
  company?: string;
  status: PipelineStatus;
};

export function LeadList({ leads }: { leads: LeadListItem[] }) {
  if (leads.length === 0) {
    return (
      <EmptyState
        title="No leads yet"
        description="New leads will appear after the live CRM API is connected."
      />
    );
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-lift" aria-label="Lead list">
      {leads.map((lead) => (
        <li key={lead.id}>
          <Link className="block p-5 hover:bg-slate-50 focus-visible:bg-slate-50" href={`/crm/leads/${lead.id}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-ink">{lead.name}</h3>
                <p className="mt-1 text-sm text-slate-600">{lead.company ?? 'No company set'}</p>
              </div>
              <PipelineBadge status={lead.status} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
