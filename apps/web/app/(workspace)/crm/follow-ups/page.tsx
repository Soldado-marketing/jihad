'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetch';
import { PageHeader } from '@/components/ui/page-header';

type FollowUp = { id: string; title: string; status: string; dueAt?: string; lead?: { name: string }; owner?: { displayName: string } };

export default function FollowUpsPage() {
  const [items, setItems] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', dueAt: '' });

  useEffect(() => { load(); }, []);
  async function load() {
    try { setItems(await apiFetch<FollowUp[]>('/follow-ups')); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const body: Record<string, string> = { title: form.title };
    if (form.dueAt) body.dueAt = form.dueAt;
    try {
      await apiFetch('/follow-ups', { method: 'POST', body: JSON.stringify(body) });
      setForm({ title: '', dueAt: '' }); setShowForm(false); load();
    } catch (e: any) { alert(e.message); }
  }

  async function complete(id: string) {
    try { await apiFetch(`/follow-ups/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'DONE' }) }); load(); }
    catch (e: any) { alert(e.message); }
  }

  const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700', DONE: 'bg-green-100 text-green-700', CANCELED: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="CRM" title="Follow-ups" description="Track outstanding follow-up tasks."
        actions={<button onClick={() => setShowForm(v => !v)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">+ New Follow-up</button>}
      />
      {showForm && (
        <form onSubmit={handleCreate} className="flex gap-3 rounded-xl border border-line bg-white p-4">
          <input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))}
            placeholder="Follow-up title" required
            className="flex-1 rounded-lg border border-line px-3 py-2 text-sm" />
          <input type="date" value={form.dueAt} onChange={e => setForm(p => ({...p, dueAt: e.target.value}))}
            className="rounded-lg border border-line px-3 py-2 text-sm" />
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Create</button>
          <button type="button" onClick={() => setShowForm(false)} className="px-3 text-sm text-muted">Cancel</button>
        </form>
      )}
      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && items.length === 0 && !error && <p className="text-center text-sm text-muted py-8">No follow-ups yet.</p>}
      {items.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line bg-white overflow-hidden">
          {items.map(f => (
            <li key={f.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50">
              <div>
                <p className="text-sm font-medium text-ink">{f.title}</p>
                <p className="text-xs text-muted mt-0.5">
                  {f.lead?.name ?? 'No lead'} · {f.dueAt ? new Date(f.dueAt).toLocaleDateString() : 'No due date'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[f.status] ?? 'bg-slate-100 text-slate-600'}`}>{f.status}</span>
                {f.status === 'PENDING' && (
                  <button onClick={() => complete(f.id)} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">
                    Mark Done
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}