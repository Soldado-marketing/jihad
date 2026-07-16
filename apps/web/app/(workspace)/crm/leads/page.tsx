'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetch';
import { PageHeader } from '@/components/ui/page-header';

type Lead = { id: string; name: string; status: string; email?: string; company?: string };

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', company: '' });

  useEffect(() => { load(); }, []);
  async function load() {
    try { setLeads(await apiFetch<Lead[]>('/leads')); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch('/leads', { method: 'POST', body: JSON.stringify(form) });
      setForm({ name: '', email: '', company: '' }); setShowForm(false); load();
    } catch (e: any) { alert(e.message); }
  }

  async function deleteLead(id: string) {
    if (!confirm('Delete this lead?')) return;
    try { await apiFetch(`/leads/${id}`, { method: 'DELETE' }); load(); }
    catch (e: any) { alert(e.message); }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="CRM" title="Leads" description="Manage incoming leads and prospects."
        actions={<button onClick={() => setShowForm(v => !v)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">+ New Lead</button>}
      />
      {showForm && (
        <form onSubmit={handleCreate} className="grid grid-cols-3 gap-3 rounded-xl border border-line bg-white p-4">
          {(['name','email','company'] as const).map(f => (
            <input key={f} value={form[f]} onChange={e => setForm(p => ({...p, [f]: e.target.value}))}
              placeholder={f.charAt(0).toUpperCase()+f.slice(1)} required={f==='name'}
              className="rounded-lg border border-line px-3 py-2 text-sm" />
          ))}
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white col-span-2">Create</button>
          <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 text-sm text-muted">Cancel</button>
        </form>
      )}
      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && leads.length === 0 && !error && <p className="text-sm text-muted text-center py-8">No leads yet.</p>}
      {leads.length > 0 && (
        <table className="w-full rounded-xl border border-line overflow-hidden bg-white">
          <thead className="bg-slate-50 text-xs font-semibold text-muted uppercase">
            <tr>
              {['Name','Email','Company','Status',''].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {leads.map(l => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm font-medium text-ink">{l.name}</td>
                <td className="px-4 py-3 text-sm text-muted">{l.email || '—'}</td>
                <td className="px-4 py-3 text-sm text-muted">{l.company || '—'}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{l.status}</span></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => deleteLead(l.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}