'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetch';
import { PageHeader } from '@/components/ui/page-header';

type VoiceNote = { id: string; title: string; status: string; durationSeconds?: number; createdAt: string; project?: { name: string } };

export default function VoicePage() {
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');

  useEffect(() => { load(); }, []);
  async function load() {
    try { setNotes(await apiFetch<VoiceNote[]>('/voice-notes')); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await apiFetch('/voice-notes', { method: 'POST', body: JSON.stringify({ title }) });
      setTitle(''); setShowForm(false); load();
    } catch (e: any) { alert(e.message); }
  }

  async function deleteNote(id: string) {
    try { await apiFetch(`/voice-notes/${id}`, { method: 'DELETE' }); load(); }
    catch (e: any) { alert(e.message); }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Workspace" title="Voice Notes" description="Create voice-note metadata records. Audio processing and transcription are deferred."
        actions={<button onClick={() => setShowForm(v => !v)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">+ New Note</button>}
      />
      {showForm && (
        <form onSubmit={handleCreate} className="flex gap-3 rounded-xl border border-line bg-white p-4">
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Note title" required className="flex-1 rounded-lg border border-line px-3 py-2 text-sm" />
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Create</button>
          <button type="button" onClick={() => setShowForm(false)} className="px-3 text-sm text-muted">Cancel</button>
        </form>
      )}
      {loading && <p className="text-sm text-muted">Loading…</p>}
      {!loading && notes.length === 0 && <p className="text-center text-sm text-muted py-8">No voice notes yet.</p>}
      <ul className="divide-y divide-line rounded-xl border border-line bg-white overflow-hidden">
        {notes.map(n => (
          <li key={n.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50">
            <div>
              <p className="text-sm font-medium text-ink">{n.title}</p>
              <p className="text-xs text-muted mt-0.5">
                {n.project?.name ?? 'No project'} · {n.status} · {new Date(n.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button onClick={() => deleteNote(n.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}