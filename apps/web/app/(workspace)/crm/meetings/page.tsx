'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetch';
import { PageHeader } from '@/components/ui/page-header';

type Meeting = { id: string; title: string; status: string; scheduledAt?: string; lead?: { name: string }; opportunity?: { title: string } };

export default function MeetingsPage() {
  const [items, setItems] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', scheduledAt: '' });

  useEffect(() => { load(); }, []);
  async function load() {
    try { setItems(await apiFetch<Meeting[]>('/meetings')); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const body: Record<string, string> = { title: form.title };
    if (form.scheduledAt) body.scheduledAt = form.scheduledAt;
    try {
      await apiFetch('/meetings', { method: 'POST', body: JSON.stringify(body) });
      setForm({ title: '', scheduledAt: '' }); setShowForm(false); load();
    } catch (e: any) { alert(e.message); }
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this meeting?')) return;
    try { await apiFetch(`/meetings/${id}`, { method: 'DELETE' }); load(); }
    catch (e: any) { alert(e.message); }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="CRM" title="Meetings" description="Schedule and track client meetings."
        actions={<button onClick={() => setShowForm(v => !v)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">+ New Meeting</button>}
      />
      {showForm && (
        <form onSubmit={handleCreate} className="flex gap-3 rounded-xl border border-line bg-white p-4">
          <input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))}
            placeholder="Meeting title" required
            className="flex-1 rounded-lg border border-line px-3 py-2 text-sm" />
          <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(p => ({...p, scheduledAt: e.target.value}))}
            className="rounded-lg border border-line px-3 py-2 text-sm" />
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Create</button>
          <button type="button" onClick={() => setShowForm(false)} className="px-3 text-sm text-muted">Cancel</button>
        </form>
      )}
      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && items.length === 0 && !error && <p className="text-center text-sm text-muted py-8">No meetings yet.</p>}
      {items.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line bg-white overflow-hidden">
          {items.map(m => (
            <li key={m.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50">
              <div>
                <p className="text-sm font-medium text-ink">{m.title}</p>
                <p className="text-xs text-muted mt-0.5">
                  {m.lead?.name || m.opportunity?.title || 'No linked record'} ·
                  {m.scheduledAt ? new Date(m.scheduledAt).toLocaleString() : 'No date'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">{m.status}</span>
                <button onClick={() => deleteItem(m.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}