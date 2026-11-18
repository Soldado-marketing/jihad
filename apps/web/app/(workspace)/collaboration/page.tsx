'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetch';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/states/error-state';
import { plainBody } from '@/lib/mentions';

type Note = { id: string; body: string; createdAt: string; author?: { displayName: string } };

export default function CollaborationPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    setLoadError(null);
    try { setNotes(await apiFetch<Note[]>('/collaboration/notes')); }
    // A failed load is not an empty list: say so and offer another try (F04).
    catch (err) { setLoadError(err instanceof Error ? err.message : 'Could not load the list.'); }
    finally { setLoading(false); }
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    try {
      await apiFetch('/collaboration/notes', { method: 'POST', body: JSON.stringify({ body }) });
      setBody(''); load();
    } catch (e: any) { alert(e.message); }
    finally { setPosting(false); }
  }

  async function deleteNote(id: string) {
    try { await apiFetch(`/collaboration/notes/${id}`, { method: 'DELETE' }); load(); }
    catch (e: any) { alert(e.message); }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Workspace" title="Internal Notes" description="Team collaboration notes and annotations." />
      <form onSubmit={handlePost} className="rounded-xl border border-line bg-white p-4 space-y-3">
        <textarea value={body} onChange={e => setBody(e.target.value)}
          placeholder="Write a note…" rows={3}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand" />
        <button type="submit" disabled={posting || !body.trim()}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {posting ? 'Posting…' : 'Post Note'}
        </button>
      </form>
      {loading && <p className="text-sm text-muted">Loading…</p>}
      {loadError && <ErrorState title="Notes could not be loaded" message={loadError} onRetry={load} />}
      {!loading && !loadError && notes.length === 0 && <p className="text-center text-sm text-muted py-8">No notes yet.</p>}
      <div className="space-y-3">
        {notes.map(n => (
          <div key={n.id} className="rounded-xl border border-line bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm text-ink [overflow-wrap:anywhere]">{plainBody(n.body)}</p>
              <button onClick={() => deleteNote(n.id)} className="text-xs text-red-400 hover:text-red-600 flex-shrink-0">Delete</button>
            </div>
            <p className="mt-2 text-xs text-muted">{n.author?.displayName ?? 'Unknown'} · {new Date(n.createdAt).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}