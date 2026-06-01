import { EmptyState } from '@/components/states/empty-state';

export type MeetingListItem = {
  id: string;
  title: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELED';
};

export function MeetingList({ meetings }: { meetings: MeetingListItem[] }) {
  if (meetings.length === 0) {
    return (
      <EmptyState
        title="No meetings yet"
        description="Meeting capture starts as a Sprint 5 CRM foundation."
      />
    );
  }

  return (
    <ul className="divide-y divide-line rounded-md border border-line bg-panel" aria-label="Meeting list">
      {meetings.map((meeting) => (
        <li key={meeting.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <span className="font-semibold text-ink">{meeting.title}</span>
          <span className="text-sm text-slate-600">{meeting.status}</span>
        </li>
      ))}
    </ul>
  );
}
