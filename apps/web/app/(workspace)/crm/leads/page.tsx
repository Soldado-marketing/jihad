import { LeadList, type LeadListItem } from '@/components/crm/lead-list';

const sprint5Leads: LeadListItem[] = [
  {
    company: 'Acme Growth',
    id: 'sprint-5-lead-placeholder',
    name: 'Sprint 5 Lead Placeholder',
    status: 'LEAD',
  },
];

export default function LeadsPage() {
  return (
    <div className="space-y-6">
      <section aria-labelledby="leads-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">CRM basic</p>
        <h2 id="leads-title" className="mt-2 text-3xl font-semibold text-ink">
          Leads
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Sprint 5 adds lead route foundations with placeholder data only.
        </p>
      </section>
      <LeadList leads={sprint5Leads} />
    </div>
  );
}
