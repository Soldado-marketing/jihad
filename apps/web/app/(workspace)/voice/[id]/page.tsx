'use client';

import { useCallback, use, useEffect, useState } from 'react';
import { ErrorState } from '@/components/states/error-state';
import { AIPlaceholderNotice } from '@/components/voice/ai-placeholder-notice';
import { HumanConfirmationNotice } from '@/components/voice/human-confirmation-notice';
import { VoiceRecorderPlaceholder } from '@/components/voice/voice-recorder-placeholder';
import { apiFetch } from '@/lib/fetch';

type VoiceNote = {
  id: string;
  title: string;
  status: string;
  languageHint?: string;
  durationSeconds?: number;
};

export default function VoiceNoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [note, setNote] = useState<VoiceNote | null>(null);
  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState<string | null>(null);
  const load = useCallback(() => {
    setLoading(true); setLoadError(null);
    apiFetch<VoiceNote>(`/voice-notes/${id}`)
      .then(setNote)
      // Any failure used to read "not found"; now the reason is shown and the load can be repeated (F04).
      .catch((err) => { setNote(null); setLoadError(err instanceof Error ? err.message : 'Voice note not found.'); })
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-sm text-slate-500 p-6">Loading…</p>;
  if (!note) return <div className="p-6"><ErrorState title="This voice note could not be opened" message={loadError ?? 'Voice note not found.'} onRetry={load} /></div>;

  return (
    <div className="grid gap-4">
      <section aria-labelledby="voice-note-title" className="rounded-2xl border border-line bg-white p-6 shadow-lift">
        <p className="text-sm font-medium text-slate-600">Voice note · {note.status}</p>
        <h2 id="voice-note-title" className="mt-2 text-2xl font-semibold text-ink">
          {note.title}
        </h2>
        {note.languageHint && (
          <p className="mt-1 text-sm text-slate-500">Language hint: {note.languageHint}</p>
        )}
        {note.durationSeconds != null && (
          <p className="mt-1 text-sm text-slate-500">Duration: {note.durationSeconds}s</p>
        )}
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Audio processing is not active in this MVP preview. Metadata, transcript review, and task draft confirmation are represented without external providers.
        </p>
      </section>
      <VoiceRecorderPlaceholder />
      <div className="rounded-2xl border border-line bg-white p-5 shadow-lift">
        <h3 className="font-semibold text-ink">Transcript</h3>
        <p className="mt-1 text-sm text-slate-500">No transcript available. Audio transcription requires an active speech-to-text provider.</p>
      </div>
      <AIPlaceholderNotice />
      <HumanConfirmationNotice />
    </div>
  );
}
