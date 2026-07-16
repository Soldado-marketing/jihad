'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetch';
import { PageHeader } from '@/components/ui/page-header';

type Opportunity = { id: string; title: string; status: string; valueCents?: number; currency?: string; lead?: { name: string } };

function fmt(cents?: number, currency = 'EUR') {
  if (!cents) return '—';
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(cents / 100);
}

export default function OpportunitiesPage() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');

  useEffect(() => { load(); }, []);
  async function load() {
    try { setItems(await apiFetch<Opportunity[]>('/opportunities')); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch('/opportunities', { method: 'POST', body: JSON.stringify({ title }) });
      setTitle(''); setShowForm(false); load();
    } catch (e: any) { alert(e.message); }
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this opportunity?')) return;
    try { await apiFetch(`/opportunities/${id}`, { method: 'DELETE' }); load(); }
    catch (e: any) { alert(e.message); }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="CRM" title="Opportunities" description="Track sales opportunities and pipeline."
        actions={<button onClick={() => setShowForm(v => !v)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">+ New Opportunity</button>}
      />
      {showForm && (
        <form onSubmit={handleCreate} className="flex gap-3 rounded-xl border border-line bg-white p-4">
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Opportunity title" required
            className="flex-1 rounded-lg border border-line px-3 py-2 text-sm" />
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Create</button>
          <button type="button" onClick={() => setShowForm(false)} className="px-3 text-sm text-muted">Cancel</button>
        </form>
      )}
      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && items.length === 0 && !error && <p className="text-center text-sm text-muted py-8">No opportunities yet.</p>}
      {items.length > 0 && (
        <table className="w-full rounded-xl border border-line overflow-hidden bg-white">
          <thead className="bg-slate-50 text-xs font-semibold text-muted uppercase">
            <tr>{['Title','Lead','Value','Status',''].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map(o => (
              <tr key={o.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm font-medium text-ink">{o.title}</td>
                <td className="px-4 py-3 text-sm text-muted">{o.lead?.name || '—'}</td>
                <td className="px-4 py-3 text-sm text-ink">{fmt(o.valueCents, o.currency)}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{o.status}</span></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => deleteItem(o.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}