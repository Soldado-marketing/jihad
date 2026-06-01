import { MeetingList, type MeetingListItem } from '@/components/crm/meeting-list';

const sprint5Meetings: MeetingListItem[] = [
  {
    id: 'sprint-5-meeting-placeholder',
    status: 'SCHEDULED',
    title: 'Sprint 5 Meeting Placeholder',
  },
];

export default function MeetingsPage() {
  return (
    <div className="space-y-6">
      <section aria-labelledby="meetings-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">CRM basic</p>
        <h2 id="meetings-title" className="mt-2 text-3xl font-semibold text-ink">
          Meetings
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Sprint 5 captures the meeting route baseline without calendar integrations.
        </p>
      </section>
      <MeetingList meetings={sprint5Meetings} />
    </div>
  );
}
