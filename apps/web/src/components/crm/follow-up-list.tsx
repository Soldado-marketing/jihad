import { EmptyState } from '@/components/states/empty-state';

export type FollowUpListItem = {
  id: string;
  title: string;
  status: 'OPEN' | 'COMPLETED' | 'OVERDUE';
};

export function FollowUpList({ followUps }: { followUps: FollowUpListItem[] }) {
  if (followUps.length === 0) {
    return (
      <EmptyState
        title="No follow-ups yet"
        description="Follow-up tracking starts as a Sprint 5 CRM foundation."
      />
    );
  }

  return (
    <ul className="divide-y divide-line rounded-md border border-line bg-panel" aria-label="Follow-up list">
      {followUps.map((followUp) => (
        <li key={followUp.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <span className="font-semibold text-ink">{followUp.title}</span>
          <span className="text-sm text-slate-600">{followUp.status}</span>
        </li>
      ))}
    </ul>
  );
}
