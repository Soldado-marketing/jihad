import { FollowUpList, type FollowUpListItem } from '@/components/crm/follow-up-list';

const sprint5FollowUps: FollowUpListItem[] = [
  {
    id: 'sprint-5-follow-up-placeholder',
    status: 'OPEN',
    title: 'Sprint 5 Follow-up Placeholder',
  },
];

export default function FollowUpsPage() {
  return (
    <div className="space-y-6">
      <section aria-labelledby="follow-ups-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">CRM basic</p>
        <h2 id="follow-ups-title" className="mt-2 text-3xl font-semibold text-ink">
          Follow-ups
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Sprint 5 captures the follow-up route baseline for manual sales activity.
        </p>
      </section>
      <FollowUpList followUps={sprint5FollowUps} />
    </div>
  );
}
