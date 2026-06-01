import { EmptyState } from '@/components/states/empty-state';

export type CostListItem = {
  id: string;
  type: string;
  amount: string;
  currency: string;
};

export function CostList({ costs }: { costs: CostListItem[] }) {
  if (costs.length === 0) {
    return <EmptyState title="No costs" description="Cost placeholders appear here." />;
  }

  return (
    <ul className="divide-y divide-line rounded-md border border-line bg-panel" aria-label="Cost list">
      {costs.map((item) => (
        <li className="flex flex-wrap items-center justify-between gap-3 p-4" key={item.id}>
          <span className="font-semibold text-ink">{item.type}</span>
          <span className="text-sm text-slate-600">
            {item.amount} {item.currency}
          </span>
        </li>
      ))}
    </ul>
  );
}
