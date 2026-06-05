import Link from 'next/link';

const crmCards = [
  { href: '/crm/leads', label: 'Leads', metric: '8 active', value: 'Lead to contacted baseline' },
  { href: '/crm/opportunities', label: 'Opportunities', metric: '3 open', value: 'Pipeline and proposal-stage placeholders' },
  { href: '/crm/meetings', label: 'Meetings', metric: '4 planned', value: 'Meeting capture baseline' },
  { href: '/crm/follow-ups', label: 'Follow-ups', metric: '5 due', value: 'Follow-up queue baseline' },
];

export function CRMOverview() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {crmCards.map((card) => (
        <Link
          key={card.href}
          className="rounded-md border border-line bg-panel p-5 shadow-shell hover:bg-slate-50 focus-visible:bg-slate-50"
          href={card.href}
        >
          <p className="text-sm font-semibold text-accent">{card.label}</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{card.metric}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{card.value}</p>
        </Link>
      ))}
    </div>
  );
}
