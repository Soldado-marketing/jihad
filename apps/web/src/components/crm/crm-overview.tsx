import Link from 'next/link';

const crmCards = [
  { href: '/crm/leads', label: 'Leads', value: 'Lead to contacted baseline' },
  { href: '/crm/opportunities', label: 'Opportunities', value: 'Pipeline placeholder' },
  { href: '/crm/meetings', label: 'Meetings', value: 'Meeting capture baseline' },
  { href: '/crm/follow-ups', label: 'Follow-ups', value: 'Follow-up queue baseline' },
];

export function CRMOverview() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {crmCards.map((card) => (
        <Link
          key={card.href}
          className="rounded-md border border-line bg-panel p-4 shadow-shell hover:bg-slate-50 focus-visible:bg-slate-50"
          href={card.href}
        >
          <p className="text-sm font-semibold text-accent">{card.label}</p>
          <p className="mt-2 text-sm text-slate-600">{card.value}</p>
        </Link>
      ))}
    </div>
  );
}
