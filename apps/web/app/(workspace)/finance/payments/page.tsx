'use client';
import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/fetch';
import { ErrorState } from '@/components/states/error-state';
import { PageHeader } from '@/components/ui/page-header';
import { toCents } from '@/lib/money';
import { createIdempotencyKeys } from '@/lib/idempotency';

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
  const submitKeys = useRef(createIdempotencyKeys());

  useEffect(() => { load(); }, []);
  async function load() {
    try { setItems(await apiFetch<Payment[]>('/payments')); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    // Integer cents only: `Number(x) * 100` turns 19.99 into 1998.9999999999998,
    // which the API rejects (and money must never pass through a float).
    const amountCents = toCents(form.amountCents);
    if (amountCents === null || amountCents <= 0) {
      alert('Enter a positive amount with at most two decimals.');
      return;
    }
    try {
      const body = JSON.stringify({ ...form, amountCents });
      await apiFetch('/payments', {
        method: 'POST',
        body,
        headers: { 'Idempotency-Key': submitKeys.current.keyFor(body) },
      });
      submitKeys.current.reset();
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
      {error && <ErrorState title="Could not load payments" message={error} onRetry={() => { setError(''); setLoading(true); void load(); }} />}
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