import Link from 'next/link';
import { EmptyState } from '../states/empty-state';

export type VoiceToTaskDraftListItem = {
  id: string;
  title: string;
  status: 'NEEDS_REVIEW' | 'CONFIRMED' | 'REJECTED';
};

export function VoiceToTaskDraftList({ drafts }: { drafts: VoiceToTaskDraftListItem[] }) {
  if (drafts.length === 0) {
    return (
      <EmptyState
        title="No voice-to-task drafts"
        description="Drafts created from transcripts will appear here for human review."
      />
    );
  }

  return (
    <section aria-label="Voice-to-task drafts" className="grid gap-3">
      {drafts.map((draft) => (
        <Link
          className="block rounded-md border border-line bg-panel p-4 hover:bg-slate-50 focus-visible:bg-slate-50"
          href={`/voice/task-drafts/${draft.id}`}
          key={draft.id}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-ink">{draft.title}</h3>
            <span className="text-xs font-medium text-slate-600">{draft.status}</span>
          </div>
        </Link>
      ))}
    </section>
  );
}
