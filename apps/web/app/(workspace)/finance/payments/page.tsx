'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetch';
import { PageHeader } from '@/components/ui/page-header';

type Payment = { id: string; amountCents: number; currency: string; method: string; status?: string; receivedAt?: string; invoice?: { invoiceNumber: string } };

function fmt(cents: number, currency = 'EUR') {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(cents / 100);
}

export default function PaymentsPage() {
  const [items, setItems] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amountCents: '', currency: 'EUR', method: 'MANUAL' });

  useEffect(() => { load(); }, []);
  async function load() {
    try { setItems(await apiFetch<Payment[]>('/payments')); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch('/payments', { method: 'POST', body: JSON.stringify({ ...form, amountCents: Number(form.amountCents) * 100 }) });
      setForm({ amountCents: '', currency: 'EUR', method: 'MANUAL' }); setShowForm(false); load();
    } catch (e: any) { alert(e.message); }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Finance" title="Payments" description="Payment records against invoices."
        actions={<button onClick={() => setShowForm(v => !v)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">+ Record Payment</button>}
      />
      {showForm && (
        <form onSubmit={handleCreate} className="flex gap-3 rounded-xl border border-line bg-white p-4">
          <input type="number" step="0.01" value={form.amountCents}
            onChange={e => setForm(p => ({...p, amountCents: e.target.value}))}
            placeholder="Amount" required className="w-32 rounded-lg border border-line px-3 py-2 text-sm" />
          <select value={form.currency} onChange={e => setForm(p => ({...p, currency: e.target.value}))}
            className="rounded-lg border border-line px-3 py-2 text-sm">
            {['EUR','USD','GBP'].map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={form.method} onChange={e => setForm(p => ({...p, method: e.target.value}))}
            className="rounded-lg border border-line px-3 py-2 text-sm">
            {['MANUAL','BANK_TRANSFER','CARD','CASH','OTHER'].map(m => <option key={m}>{m}</option>)}
          </select>
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Record</button>
          <button type="button" onClick={() => setShowForm(false)} className="px-3 text-sm text-muted">Cancel</button>
        </form>
      )}
      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && items.length === 0 && !error && <p className="text-center text-sm text-muted py-8">No payments recorded yet.</p>}
      {items.length > 0 && (
        <table className="w-full rounded-xl border border-line overflow-hidden bg-white">
          <thead className="bg-slate-50 text-xs font-semibold text-muted uppercase">
            <tr>{['Invoice','Amount','Method','Date'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map(p => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-muted">{p.invoice?.invoiceNumber ?? '—'}</td>
                <td className="px-4 py-3 text-sm font-medium text-green-700">{fmt(p.amountCents, p.currency)}</td>
                <td className="px-4 py-3 text-sm text-muted">{p.method}</td>
                <td className="px-4 py-3 text-sm text-muted">{p.receivedAt ? new Date(p.receivedAt).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}