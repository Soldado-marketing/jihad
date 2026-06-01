import Link from 'next/link';
import { EmptyState } from '../states/empty-state';
import { TranscriptionStatusBadge, type TranscriptionStatus } from './transcription-status-badge';

export type VoiceNoteListItem = {
  id: string;
  title: string;
  language: string;
  duration: string;
  transcriptStatus: TranscriptionStatus;
};

export function VoiceNoteList({ voiceNotes }: { voiceNotes: VoiceNoteListItem[] }) {
  if (voiceNotes.length === 0) {
    return (
      <EmptyState
        title="No voice notes"
        description="Voice note metadata and transcripts will appear here when available."
      />
    );
  }

  return (
    <section aria-label="Voice notes" className="grid gap-3">
      {voiceNotes.map((voiceNote) => (
        <Link
          className="block rounded-md border border-line bg-panel p-4 hover:bg-slate-50 focus-visible:bg-slate-50"
          href={`/voice/${voiceNote.id}`}
          key={voiceNote.id}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-ink">{voiceNote.title}</h3>
              <p className="mt-1 text-sm text-slate-600">
                {voiceNote.language} · {voiceNote.duration}
              </p>
            </div>
            <TranscriptionStatusBadge status={voiceNote.transcriptStatus} />
          </div>
        </Link>
      ))}
    </section>
  );
}
