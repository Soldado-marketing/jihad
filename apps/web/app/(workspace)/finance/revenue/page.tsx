import { RevenueList, type RevenueListItem } from '@/components/finance/revenue-list';
import { OwnerOnlyFinanceNotice } from '@/components/finance/owner-only-finance-notice';

const sprint9Revenue: RevenueListItem[] = [
  {
    amount: '2,500.00',
    currency: 'EUR',
    id: 'sprint-9-revenue-placeholder',
    source: 'Invoice revenue placeholder',
  },
];

export default function RevenuePage() {
  return (
    <div className="grid gap-6">
      <section aria-labelledby="revenue-title">
        <p className="text-sm font-medium text-slate-600">Sprint 9</p>
        <h2 id="revenue-title" className="mt-2 text-3xl font-semibold text-ink">
          Revenue
        </h2>
      </section>
      <OwnerOnlyFinanceNotice />
      <RevenueList revenue={sprint9Revenue} />
    </div>
  );
}
