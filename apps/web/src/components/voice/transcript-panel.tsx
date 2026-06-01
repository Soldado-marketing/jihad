import { TranscriptionStatusBadge, type TranscriptionStatus } from './transcription-status-badge';

export function TranscriptPanel({
  confidence,
  language,
  status,
  text,
}: {
  confidence: string;
  language: string;
  status: TranscriptionStatus;
  text: string;
}) {
  return (
    <section aria-labelledby="transcript-title" className="rounded-md border border-line bg-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="transcript-title" className="text-base font-semibold text-ink">
            Transcript
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Language: {language} · Confidence: {confidence}
          </p>
        </div>
        <TranscriptionStatusBadge status={status} />
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-700">{text}</p>
    </section>
  );
}
