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
        description="Meetings will appear after the live CRM calendar data is connected."
      />
    );
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-lift" aria-label="Meeting list">
      {meetings.map((meeting) => (
        <li key={meeting.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
          <span className="font-semibold text-ink">{meeting.title}</span>
          <span className="text-sm text-slate-600">{meeting.status}</span>
        </li>
      ))}
    </ul>
  );
}
