import { CostList, type CostListItem } from '@/components/finance/cost-list';
import { OwnerOnlyFinanceNotice } from '@/components/finance/owner-only-finance-notice';

const sprint9Costs: CostListItem[] = [
  {
    amount: '850.00',
    currency: 'EUR',
    id: 'sprint-9-cost-placeholder',
    type: 'Contractor cost placeholder',
  },
];

export default function CostsPage() {
  return (
    <div className="grid gap-6">
      <section aria-labelledby="costs-title">
        <p className="text-sm font-medium text-slate-600">Sprint 9</p>
        <h2 id="costs-title" className="mt-2 text-3xl font-semibold text-ink">
          Costs
        </h2>
      </section>
      <OwnerOnlyFinanceNotice />
      <CostList costs={sprint9Costs} />
    </div>
  );
}
