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
        description="Follow-ups will appear after live CRM persistence is connected."
      />
    );
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-lift" aria-label="Follow-up list">
      {followUps.map((followUp) => (
        <li key={followUp.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
          <span className="font-semibold text-ink">{followUp.title}</span>
          <span className="text-sm text-slate-600">{followUp.status}</span>
        </li>
      ))}
    </ul>
  );
}
