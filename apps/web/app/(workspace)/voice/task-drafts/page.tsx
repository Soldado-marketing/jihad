'use client';

import { useEffect, useState } from 'react';
import {
  VoiceToTaskDraftList,
  type VoiceToTaskDraftListItem,
} from '@/components/voice/voice-to-task-draft-list';
import { apiFetch } from '@/lib/fetch';
import { PageHeader } from '@/components/ui/page-header';

export default function VoiceTaskDraftsPage() {
  const [drafts, setDrafts] = useState<VoiceToTaskDraftListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<VoiceToTaskDraftListItem[]>('/voice-to-task-drafts')
      .then(setDrafts)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Voice"
        title="Voice-To-Task Drafts"
        description="Drafts created from voice note transcripts await human review before becoming tasks."
      />
      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && !error && <VoiceToTaskDraftList drafts={drafts} />}
    </div>
  );
}
