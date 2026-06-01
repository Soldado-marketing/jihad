import {
  OpportunityList,
  type OpportunityListItem,
} from '@/components/crm/opportunity-list';

const sprint5Opportunities: OpportunityListItem[] = [
  {
    id: 'sprint-5-opportunity-placeholder',
    status: 'CONTACTED',
    title: 'Sprint 5 Opportunity Placeholder',
    valueLabel: 'USD 2,500',
  },
];

export default function OpportunitiesPage() {
  return (
    <div className="space-y-6">
      <section aria-labelledby="opportunities-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">CRM basic</p>
        <h2 id="opportunities-title" className="mt-2 text-3xl font-semibold text-ink">
          Opportunities
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Sprint 5 adds opportunity route foundations without forecasting.
        </p>
      </section>
      <OpportunityList opportunities={sprint5Opportunities} />
    </div>
  );
}
