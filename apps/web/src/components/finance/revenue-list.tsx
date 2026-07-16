import { EmptyState } from '@/components/states/empty-state';

export type RevenueListItem = {
  id: string;
  source: string;
  amount: string;
  currency: string;
};

export function RevenueList({ revenue }: { revenue: RevenueListItem[] }) {
  if (revenue.length === 0) {
    return <EmptyState title="No revenue yet" description="Revenue records will appear after live finance data is connected." />;
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-lift" aria-label="Revenue list">
      {revenue.map((item) => (
        <li className="flex flex-wrap items-center justify-between gap-3 p-5" key={item.id}>
          <span className="font-semibold text-ink">{item.source}</span>
          <span className="text-sm text-slate-600">
            {item.amount} {item.currency}
          </span>
        </li>
      ))}
    </ul>
  );
}
