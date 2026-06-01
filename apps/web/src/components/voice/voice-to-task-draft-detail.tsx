import { AIPlaceholderNotice } from './ai-placeholder-notice';
import { HumanConfirmationNotice } from './human-confirmation-notice';

export function VoiceToTaskDraftDetail({ id }: { id: string }) {
  return (
    <div className="grid gap-4">
      <section aria-labelledby="draft-title" className="rounded-md border border-line bg-panel p-4">
        <p className="text-sm font-medium text-slate-600">Voice-to-task draft</p>
        <h2 id="draft-title" className="mt-2 text-2xl font-semibold text-ink">
          Review draft {id}
        </h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-ink">Suggested title</dt>
            <dd className="mt-1 text-slate-600">Review campaign delivery task</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">Suggested priority</dt>
            <dd className="mt-1 text-slate-600">Medium</dd>
          </div>
        </dl>
      </section>
      <AIPlaceholderNotice />
      <HumanConfirmationNotice />
    </div>
  );
}
