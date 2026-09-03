'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetch';
import { PageHeader } from '@/components/ui/page-header';
import { toCents } from '@/lib/money';

type Opportunity = { id: string; title: string; status: string; valueCents?: number; currency?: string; lead?: { name: string } };
type LeadOption = { id: string; name: string };

const EMPTY_FORM = { title: '', leadId: '', value: '', currency: 'EUR' };

function fmt(cents?: number, currency = 'EUR') {
  if (!cents) return '—';
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(cents / 100);
}

export default function OpportunitiesPage() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [leads, setLeads] = useState<LeadOption[]>([]);

  useEffect(() => {
    load();
    // The lead link is optional, so a failure here must not block the page.
    apiFetch<LeadOption[]>('/leads').then(setLeads).catch(() => setLeads([]));
  }, []);
  async function load() {
    try { setItems(await apiFetch<Opportunity[]>('/opportunities')); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    // Amounts are entered in major units and stored in integer cents, so the
    // conversion goes through the same helper the invoice editor uses.
    const valueCents = form.value.trim() === '' ? null : toCents(form.value);
    if (form.value.trim() !== '' && valueCents === null) {
      setError('Enter the value as a plain amount, for example 1500 or 1500.50.');
      return;
    }
    try {
      await apiFetch('/opportunities', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          ...(form.leadId ? { leadId: form.leadId } : {}),
          ...(valueCents === null ? {} : { valueCents, currency: form.currency }),
        }),
      });
      setForm(EMPTY_FORM); setShowForm(false); setError(''); load();
    } catch (e: any) { setError(e.message); }
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
        <form onSubmit={handleCreate} className="space-y-3 rounded-xl border border-line bg-white p-4">
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Opportunity title" required minLength={2}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm" />
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-slate-600">Lead (optional)</span>
              <select value={form.leadId} onChange={e => setForm({ ...form, leadId: e.target.value })}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm">
                <option value="">No lead</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-slate-600">Value (optional)</span>
              <input value={form.value} onChange={e => setForm({ ...form, value: e.target.value })}
                inputMode="decimal" placeholder="1500.00"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-slate-600">Currency</span>
              <input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                maxLength={3} className="w-full rounded-lg border border-line px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Create</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-3 text-sm text-muted">Cancel</button>
          </div>
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