'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { type ClientProblem, type Delivery, PROBLEM_STATUS_LABEL } from '@/lib/client-portal';
import { apiFetch } from '@/lib/fetch';

/**
 * "Request new work": separate from asking for a revision on a delivery. The
 * request goes to the company's management, and the company answers here.
 */
export default function ClientRequestsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
      <RequestsPage />
    </Suspense>
  );
}

function RequestsPage() {
  const params = useSearchParams();
  const preselected = params.get('delivery') ?? '';
  const [items, setItems] = useState<ClientProblem[] | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [open, setOpen] = useState(!!preselected || params.get('new') === '1');
  const [form, setForm] = useState({ subject: '', body: '', deliveryId: preselected });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');

  const load = useCallback(() => {
    apiFetch<ClientProblem[]>('/client/requests').then(setItems).catch(() => setItems([]));
  }, []);
  useEffect(() => {
    load();
    apiFetch<Delivery[]>('/client/deliveries').then(setDeliveries).catch(() => setDeliveries([]));
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(''); setSent('');
    try {
      await apiFetch('/client/requests', {
        method: 'POST',
        body: JSON.stringify({ subject: form.subject.trim(), body: form.body.trim(), ...(form.deliveryId ? { deliveryId: form.deliveryId } : {}) }),
      });
      setForm({ subject: '', body: '', deliveryId: '' });
      setOpen(false);
      setSent('Thank you. Your request reached our management; we will answer you here.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <Link href="/client" className="text-sm text-brand hover:underline">← Home</Link>
      <PageHeader eyebrow="Help" title="Request new work"
        description="Something went wrong, or you are not happy with how things went? Tell our management directly. This is separate from asking for changes to a delivery."
        actions={!open && (
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Request new work</button>
        )} />

      {open && (
        <form onSubmit={(e) => void submit(e)} aria-labelledby="request-title" className="grid gap-4 rounded-xl border border-line bg-white p-5">
          <h2 id="request-title" className="font-semibold text-ink">Request new work</h2>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">What is it about?</span>
            <input name="subject" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} required minLength={3} maxLength={140}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink" placeholder="A short title" />
          </label>
          {deliveries.length > 0 && (
            <label className="block text-sm">
              <span className="mb-1 block text-slate-700">Related delivery (optional)</span>
              <select name="deliveryId" value={form.deliveryId} onChange={(e) => setForm((f) => ({ ...f, deliveryId: e.target.value }))}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink">
                <option value="">Not about a specific delivery</option>
                {deliveries.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
            </label>
          )}
          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">What happened?</span>
            <textarea name="body" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} required minLength={5} maxLength={4000} rows={5}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink" placeholder="Describe the work you need. Our management reads this and plans it with you." />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy || form.subject.trim().length < 3 || form.body.trim().length < 5}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Sending…' : 'Send to management'}</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink">Cancel</button>
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </form>
      )}
      {sent && <p className="text-sm text-green-700">{sent}</p>}

      <section aria-labelledby="requested-title" className="rounded-xl border border-line bg-white p-5">
        <h2 id="requested-title" className="font-semibold text-ink">What you requested</h2>
        {items === null && <p className="mt-2 text-sm text-slate-500">Loading…</p>}
        {items?.length === 0 && <p className="mt-2 text-sm text-slate-600">You have not requested anything yet.</p>}
        <ul className="mt-3 divide-y divide-line">
          {items?.map((r) => (
            <li key={r.id}>
              <Link href={`/client/requests/${r.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-slate-50">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{r.subject}</span>
                  <span className="block text-xs text-muted">{r.delivery ? `${r.delivery.title} · ` : ''}{new Date(r.updatedAt).toLocaleString()}</span>
                </span>
                <StatusBadge status={r.status} label={PROBLEM_STATUS_LABEL[r.status]} />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
