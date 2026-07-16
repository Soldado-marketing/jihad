'use client';

import { use, useEffect, useState } from 'react';
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

  useEffect(() => {
    apiFetch<Draft>(`/voice-to-task-drafts/${id}`)
      .then(setDraft)
      .catch(() => setDraft(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-sm text-slate-500 p-6">Loading…</p>;
  if (!draft) return <p className="text-sm text-red-500 p-6">Draft not found.</p>;

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
