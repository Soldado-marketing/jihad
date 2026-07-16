'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetch';
import { PageHeader } from '@/components/ui/page-header';

type Report = { id: string; name: string; reportType: string; createdAt: string };

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', reportType: 'CUSTOM' });

  useEffect(() => { load(); }, []);
  async function load() {
    try { setReports(await apiFetch<Report[]>('/reports')); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch('/reports', { method: 'POST', body: JSON.stringify(form) });
      setForm({ name: '', reportType: 'CUSTOM' }); setShowForm(false); load();
    } catch (e: any) { alert(e.message); }
  }

  async function runReport(id: string) {
    try {
      await apiFetch(`/reports/${id}/run`, { method: 'POST' });
      alert('Report queued.');
    } catch (e: any) { alert(e.message); }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Analytics" title="Reports" description="Create and run custom reports."
        actions={<button onClick={() => setShowForm(v => !v)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">+ New Report</button>}
      />
      {showForm && (
        <form onSubmit={handleCreate} className="flex gap-3 rounded-xl border border-line bg-white p-4">
          <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
            placeholder="Report name" required className="flex-1 rounded-lg border border-line px-3 py-2 text-sm" />
          <select value={form.reportType} onChange={e => setForm(p => ({...p, reportType: e.target.value}))}
            className="rounded-lg border border-line px-3 py-2 text-sm">
            {['CUSTOM','CRM','FINANCE','PROJECT'].map(t => <option key={t}>{t}</option>)}
          </select>
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Create</button>
          <button type="button" onClick={() => setShowForm(false)} className="px-3 text-sm text-muted">Cancel</button>
        </form>
      )}
      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && reports.length === 0 && !error && <p className="text-center text-sm text-muted py-8">No reports yet.</p>}
      {reports.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line bg-white overflow-hidden">
          {reports.map(r => (
            <li key={r.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50">
              <div>
                <p className="text-sm font-medium text-ink">{r.name}</p>
                <p className="text-xs text-muted mt-0.5">{r.reportType} · {new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
              <button onClick={() => runReport(r.id)} className="rounded-lg border border-brand px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand/5">Run</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}