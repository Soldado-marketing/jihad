import Link from 'next/link';

const crmSections = [
  { href: '/crm/leads', label: 'Leads', description: 'New and contacted lead queue' },
  { href: '/crm/opportunities', label: 'Opportunities', description: 'Pipeline deals requiring owner review' },
  { href: '/crm/meetings', label: 'Meetings', description: 'Discovery and proposal meetings' },
  { href: '/crm/follow-ups', label: 'Follow-ups', description: 'Sales actions waiting for response' },
];

export function CRMOverview() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {crmSections.map((section) => (
        <Link
          key={section.href}
          className="rounded-2xl border border-line bg-panel p-5 shadow-card hover:bg-slate-50 focus-visible:bg-slate-50"
          href={section.href}
        >
          <p className="text-sm font-semibold text-accent">{section.label}</p>
          <p className="mt-2 text-2xl font-semibold text-ink">—</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{section.description}</p>
        </Link>
      ))}
    </div>
  );
}
