import { AIPlaceholderNotice } from './ai-placeholder-notice';
import { HumanConfirmationNotice } from './human-confirmation-notice';
import { TranscriptPanel } from './transcript-panel';
import { VoiceRecorderPlaceholder } from './voice-recorder-placeholder';

export function VoiceNoteDetail({ id }: { id: string }) {
  return (
    <div className="grid gap-4">
      <section aria-labelledby="voice-note-title" className="rounded-2xl border border-line bg-white p-6 shadow-lift">
        <p className="text-sm font-medium text-slate-600">Voice note</p>
        <h2 id="voice-note-title" className="mt-2 text-2xl font-semibold text-ink">
          Voice note {id}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Audio processing is not active in this MVP preview. Metadata, transcript review, and task draft confirmation are represented without external providers.
        </p>
      </section>
      <VoiceRecorderPlaceholder />
      <TranscriptPanel
        confidence="82%"
        language="Arabic / English / German mixed"
        status="LOW_CONFIDENCE"
        text="Draft transcript sample. Human review is required before a task draft can be confirmed."
      />
      <AIPlaceholderNotice />
      <HumanConfirmationNotice />
    </div>
  );
}
