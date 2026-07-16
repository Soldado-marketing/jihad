import Link from 'next/link';
import { OwnerOnlyFinanceNotice } from './owner-only-finance-notice';
import { ProfitabilitySummaryCard } from './profitability-summary-card';

const financeLinks = [
  { href: '/finance/revenue', label: 'Revenue' },
  { href: '/finance/costs', label: 'Costs' },
  { href: '/finance/invoices', label: 'Invoices' },
  { href: '/finance/payments', label: 'Payments' },
];

export function FinanceOverview() {
  return (
    <div className="grid gap-5">
      <OwnerOnlyFinanceNotice />
      <ProfitabilitySummaryCard
        summary={{
          costs: '—',
          grossProfit: '—',
          revenue: '—',
        }}
      />
      <section aria-label="Finance sections" className="grid gap-3 md:grid-cols-4">
        {financeLinks.map((link) => (
          <Link
            className="rounded-2xl border border-line bg-white p-5 font-semibold text-ink shadow-lift transition hover:-translate-y-0.5 hover:border-accent/40 hover:bg-slate-50 focus-visible:bg-slate-50"
            href={link.href}
            key={link.href}
          >
            {link.label}
          </Link>
        ))}
      </section>
    </div>
  );
}
