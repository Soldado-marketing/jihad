import {
  VoiceToTaskDraftList,
  type VoiceToTaskDraftListItem,
} from '@/components/voice/voice-to-task-draft-list';

const sprint8Drafts: VoiceToTaskDraftListItem[] = [
  {
    id: 'sprint-8-draft',
    status: 'NEEDS_REVIEW',
    title: 'Review campaign delivery task',
  },
];

export default function VoiceTaskDraftsPage() {
  return (
    <div className="grid gap-6">
      <section aria-labelledby="drafts-title">
        <p className="text-sm font-medium text-slate-600">Sprint 8</p>
        <h2 id="drafts-title" className="mt-2 text-3xl font-semibold text-ink">
          Voice-To-Task Drafts
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Drafts remain review-only and cannot create tasks without human confirmation.
        </p>
      </section>
      <VoiceToTaskDraftList drafts={sprint8Drafts} />
    </div>
  );
}
