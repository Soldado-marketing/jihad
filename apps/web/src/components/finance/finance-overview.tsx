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
          costs: '€850.00',
          grossProfit: '€1,650.00',
          revenue: '€2,500.00',
        }}
      />
      <section aria-label="Finance sections" className="grid gap-3 md:grid-cols-4">
        {financeLinks.map((link) => (
          <Link
            className="rounded-md border border-line bg-panel p-4 font-semibold text-ink hover:bg-slate-50 focus-visible:bg-slate-50"
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
