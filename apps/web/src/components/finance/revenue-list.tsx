import { EmptyState } from '@/components/states/empty-state';

export type RevenueListItem = {
  id: string;
  source: string;
  amount: string;
  currency: string;
};

export function RevenueList({ revenue }: { revenue: RevenueListItem[] }) {
  if (revenue.length === 0) {
    return <EmptyState title="No revenue" description="Revenue placeholders appear here." />;
  }

  return (
    <ul className="divide-y divide-line rounded-md border border-line bg-panel" aria-label="Revenue list">
      {revenue.map((item) => (
        <li className="flex flex-wrap items-center justify-between gap-3 p-4" key={item.id}>
          <span className="font-semibold text-ink">{item.source}</span>
          <span className="text-sm text-slate-600">
            {item.amount} {item.currency}
          </span>
        </li>
      ))}
    </ul>
  );
}
