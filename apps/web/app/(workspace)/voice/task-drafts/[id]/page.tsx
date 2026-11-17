'use client';

import { useCallback, use, useEffect, useState } from 'react';
import { ErrorState } from '@/components/states/error-state';
import { AIPlaceholderNotice } from '@/components/voice/ai-placeholder-notice';
import { HumanConfirmationNotice } from '@/components/voice/human-confirmation-notice';
import { apiFetch } from '@/lib/fetch';

type Draft = {
  id: string;
  title: string;
  description?: string;
  suggestedPriority?: string;
  status: string;
};

export default function VoiceToTaskDraftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState<string | null>(null);
  const load = useCallback(() => {
    setLoading(true); setLoadError(null);
    apiFetch<Draft>(`/voice-to-task-drafts/${id}`)
      .then(setDraft)
      // Any failure used to read "not found"; now the reason is shown and the load can be repeated (F04).
      .catch((err) => { setDraft(null); setLoadError(err instanceof Error ? err.message : 'Draft not found.'); })
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-sm text-slate-500 p-6">Loading…</p>;
  if (!draft) return <div className="p-6"><ErrorState title="This draft could not be opened" message={loadError ?? 'Draft not found.'} onRetry={load} /></div>;

  return (
    <div className="grid gap-4">
      <section aria-labelledby="draft-title" className="rounded-md border border-line bg-panel p-4">
        <p className="text-sm font-medium text-slate-600">Voice-to-task draft · {draft.status}</p>
        <h2 id="draft-title" className="mt-2 text-2xl font-semibold text-ink">
          {draft.title}
        </h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-ink">Suggested priority</dt>
            <dd className="mt-1 text-slate-600">{draft.suggestedPriority ?? 'Not set'}</dd>
          </div>
          {draft.description && (
            <div>
              <dt className="font-medium text-ink">Description</dt>
              <dd className="mt-1 text-slate-600">{draft.description}</dd>
            </div>
          )}
        </dl>
      </section>
      <AIPlaceholderNotice />
      <HumanConfirmationNotice />
    </div>
  );
}
