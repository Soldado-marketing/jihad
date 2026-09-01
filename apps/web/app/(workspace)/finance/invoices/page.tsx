'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetch';
import { PageHeader } from '@/components/ui/page-header';
import {
  EMPTY_LINE,
  InvoiceLineEditor,
  computeTotals,
  toCents,
  type InvoiceLineDraft,
} from '@/components/finance/invoice-line-editor';

type Invoice = { id: string; invoiceNumber: string; status: string; currency: string; totalCents: number; dueAt?: string; project?: { name: string } };

function fmt(cents: number, currency = 'EUR') {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(cents / 100);
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ invoiceNumber: '', currency: 'EUR', projectId: '', dueAt: '' });
  const [lines, setLines] = useState<InvoiceLineDraft[]>([{ ...EMPTY_LINE }]);
  const [projects, setProjects] = useState<{ id: string; name?: string }[]>([]);

  useEffect(() => {
    load();
    // Optional: an invoice without a project is still valid.
    apiFetch<{ id: string; name?: string }[]>('/projects')
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);
  async function load() {
    try { setInvoices(await apiFetch<Invoice[]>('/invoices')); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Amounts are converted to integer cents here so the request body matches
    // what the API stores. The server recomputes the totals from these lines
    // and ignores any total sent by a client, so the two cannot drift.
    const totals = computeTotals(lines);
    if (!totals.valid) {
      setError('Fix the line items before creating the invoice.');
      return;
    }

    const payload = {
      invoiceNumber: form.invoiceNumber,
      currency: form.currency,
      ...(form.projectId ? { projectId: form.projectId } : {}),
      ...(form.dueAt ? { dueAt: new Date(form.dueAt).toISOString() } : {}),
      lines: lines.map((line) => ({
        description: line.description.trim(),
        quantity: Number(line.quantity),
        unitAmountCents: toCents(line.unitAmount) as number,
      })),
    };

    try {
      await apiFetch('/invoices', { method: 'POST', body: JSON.stringify(payload) });
      setForm({ invoiceNumber: '', currency: 'EUR', projectId: '', dueAt: '' });
      setLines([{ ...EMPTY_LINE }]);
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err?.message ?? 'Could not create the invoice.');
    }
  }

  const STATUS_COLORS: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-600', SENT: 'bg-blue-100 text-blue-700',
    PAID: 'bg-green-100 text-green-700', OVERDUE: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Finance" title="Invoices" description="Create and track client invoices."
        actions={<button onClick={() => setShowForm(v => !v)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">+ New Invoice</button>}
      />
      {showForm && (
        <form onSubmit={handleCreate} className="space-y-4 rounded-xl border border-line bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <input value={form.invoiceNumber} onChange={e => setForm(p => ({...p, invoiceNumber: e.target.value}))}
              placeholder="Invoice number" required minLength={2}
              className="rounded-lg border border-line px-3 py-2 text-sm sm:col-span-2" />
            <select value={form.currency} onChange={e => setForm(p => ({...p, currency: e.target.value}))}
              aria-label="Currency" className="rounded-lg border border-line px-3 py-2 text-sm">
              {['EUR','USD','GBP'].map(c => <option key={c}>{c}</option>)}
            </select>
            <input type="date" value={form.dueAt} aria-label="Due date"
              onChange={e => setForm(p => ({...p, dueAt: e.target.value}))}
              className="rounded-lg border border-line px-3 py-2 text-sm" />
          </div>

          <select value={form.projectId} aria-label="Project"
            onChange={e => setForm(p => ({...p, projectId: e.target.value}))}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">No project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name ?? p.id}</option>)}
          </select>

          <InvoiceLineEditor lines={lines} currency={form.currency} onChange={setLines} />

          <div className="flex gap-3">
            <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Create</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-3 text-sm text-muted">Cancel</button>
          </div>
        </form>
      )}
      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && invoices.length === 0 && !error && <p className="text-center text-sm text-muted py-8">No invoices yet.</p>}
      {invoices.length > 0 && (
        <table className="w-full rounded-xl border border-line overflow-hidden bg-white">
          <thead className="bg-slate-50 text-xs font-semibold text-muted uppercase">
            <tr>{['Number','Project','Total','Due','Status'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {invoices.map(i => (
              <tr key={i.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm font-medium text-ink">{i.invoiceNumber}</td>
                <td className="px-4 py-3 text-sm text-muted">{i.project?.name || '—'}</td>
                <td className="px-4 py-3 text-sm text-ink">{fmt(i.totalCents, i.currency)}</td>
                <td className="px-4 py-3 text-sm text-muted">{i.dueAt ? new Date(i.dueAt).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[i.status] ?? 'bg-slate-100 text-slate-600'}`}>{i.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}