import { CRMOverview } from '@/components/crm/crm-overview';

export default function CRMPage() {
  return (
    <div className="space-y-6">
      <section aria-labelledby="crm-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Sprint 5 foundation
        </p>
        <h2 id="crm-title" className="mt-2 text-3xl font-semibold text-ink">
          CRM
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Basic pipeline, lead, opportunity, meeting, and follow-up placeholders for internal workspace users.
        </p>
      </section>
      <CRMOverview />
    </div>
  );
}
