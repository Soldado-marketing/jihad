'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { DetailPanel } from '@/components/ui/detail-panel';
import { apiFetch } from '@/lib/fetch';
import { DECISION_THREAD, isDecision, taskFromDecision } from '@/lib/meeting-decisions';

type Note = { id: string; body: string; threadKey?: string | null; createdAt: string };
export type PanelMeeting = { id: string; title: string; notes?: string | null };

/**
 * Meeting notes, decisions and the tasks they become (MAOS-T109). Reuses
 * Meeting.notes, InternalNote (thread "decision") and Task - no new records.
 */
export function MeetingPanel({ meeting, onClose }: { meeting: PanelMeeting | null; onClose: () => void }) {
  const [notes, setNotes] = useState('');
  const [decisions, setDecisions] = useState<Note[]>([]);
  const [draft, setDraft] = useState('');
  const [created, setCreated] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  const loadDecisions = useCallback(async (id: string) => {
    try {
      const all = await apiFetch<Note[]>(`/collaboration/notes?resourceType=meeting&resourceId=${id}`);
      setDecisions(all.filter(isDecision));
    } catch {
      setDecisions([]);
    }
  }, []);

  useEffect(() => {
    if (!meeting) return;
    setNotes(meeting.notes ?? '');
    setDraft('');
    setCreated({});
    setMessage('');
    void loadDecisions(meeting.id);
  }, [meeting, loadDecisions]);

  if (!meeting) return null;

  async function saveNotes() {
    try {
      await apiFetch(`/meetings/${meeting!.id}`, { method: 'PATCH', body: JSON.stringify({ notes }) });
      setMessage('Notes saved.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Notes could not be saved.');
    }
  }

  async function addDecision() {
    const body = draft.trim();
    if (body.length < 2) return;
    try {
      await apiFetch('/collaboration/notes', {
        method: 'POST',
        body: JSON.stringify({ body, resourceType: 'meeting', resourceId: meeting!.id, threadKey: DECISION_THREAD }),
      });
      setDraft('');
      await loadDecisions(meeting!.id);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'The decision could not be recorded.');
    }
  }

  async function createTask(decision: Note) {
    try {
      const task = await apiFetch<{ id: string }>('/tasks', {
        method: 'POST',
        body: JSON.stringify(taskFromDecision(meeting!.title, decision.body)),
      });
      setCreated((c) => ({ ...c, [decision.id]: task.id }));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'The task could not be created.');
    }
  }

  return (
    <DetailPanel open onClose={onClose} title={meeting.title}>
      <div className="space-y-6 text-sm">
        <section>
          <h3 className="mb-1 font-semibold text-ink">Notes</h3>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} maxLength={2000} aria-label="Meeting notes" className="w-full rounded-lg border border-line px-3 py-2" />
          <button type="button" onClick={() => void saveNotes()} className="mt-2 rounded-lg border border-line px-3 py-1.5">
            Save notes
          </button>
        </section>

        <section>
          <h3 className="mb-1 font-semibold text-ink">Decisions</h3>
          {decisions.length === 0 && <p className="text-muted">No decisions recorded yet.</p>}
          <ul className="space-y-2">
            {decisions.map((d) => (
              <li key={d.id} className="rounded-lg border border-line p-3">
                <p className="whitespace-pre-wrap text-ink">{d.body}</p>
                <div className="mt-2">
                  {created[d.id] ? (
                    <Link href={`/tasks/${created[d.id]}`} className="text-xs text-brand hover:underline">
                      Task created – open it
                    </Link>
                  ) : (
                    <button type="button" onClick={() => void createTask(d)} className="text-xs text-brand hover:underline">
                      Create task from this decision
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Record a decision…" aria-label="New decision" maxLength={2000} className="flex-1 rounded-lg border border-line px-3 py-2" />
            <button type="button" onClick={() => void addDecision()} disabled={draft.trim().length < 2} className="rounded-lg bg-brand px-3 py-2 text-white disabled:opacity-50">
              Add
            </button>
          </div>
        </section>

        {message && <p role="status" className="text-muted">{message}</p>}
      </div>
    </DetailPanel>
  );
}
