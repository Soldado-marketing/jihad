'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { ErrorState } from '@/components/states/error-state';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiFetch } from '@/lib/fetch';
import { NOTIFICATIONS_CHANGED } from '@/lib/notifications';

type Message = { id: string; from: 'client' | 'company'; internal: boolean; author: string | null; body: string; at: string };
type Report = {
  id: string; subject: string; status: 'OPEN' | 'ANSWERED' | 'RESOLVED'; createdAt: string; updatedAt: string;
  customer: { clientScopeKey: string | null; name: string | null };
  delivery: { id: string; title: string } | null;
  messages: Message[];
};
const STATUS_LABEL: Record<Report['status'], string> = { OPEN: 'Needs an answer', ANSWERED: 'Answered', RESOLVED: 'Resolved' };

/**
 * Client problem reports (owner decision 2026-11-02): management only. An
 * answer reaches the client as the company; an internal note stays here.
 * The employee a report may be about is never told by this page or the API.
 */
export default function ComplaintsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
      <Complaints />
    </Suspense>
  );
}

function Complaints() {
  const params = useSearchParams();
  const [items, setItems] = useState<Report[] | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'open' | 'resolved'>('open');
  const [selectedId, setSelectedId] = useState<string | null>(params.get('open'));
  const [selected, setSelected] = useState<Report | null>(null);
  const [text, setText] = useState('');
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setItems(await apiFetch<Report[]>('/complaints'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load problem reports.');
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!selectedId) { setSelected(null); return; }
    apiFetch<Report>(`/complaints/${selectedId}`).then(setSelected).catch((e) => setActionError(e instanceof Error ? e.message : 'Could not open the report.'));
  }, [selectedId]);

  const shown = (items ?? []).filter((r) => (tab === 'resolved' ? r.status === 'RESOLVED' : r.status !== 'RESOLVED'));
  const openCount = (items ?? []).filter((r) => r.status === 'OPEN').length;

  async function act(path: string, body?: unknown) {
    if (!selected) return;
    setBusy(true); setActionError('');
    try {
      const updated = await apiFetch<Report>(`/complaints/${selected.id}/${path}`, { method: 'POST', body: JSON.stringify(body ?? {}) });
      setSelected(updated);
      setText('');
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'The action failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Clients" title="Problem reports"
        description="What clients reported to management. Answers go to the client in the company's name; internal notes stay here. The person the report may be about is not notified." />
      {error && <ErrorState message={error} onRetry={() => void load()} />}

      <div role="tablist" className="flex gap-2">
        {(['open', 'resolved'] as const).map((t) => (
          <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm ${tab === t ? 'bg-brand text-white' : 'border border-line bg-white text-ink'}`}>
            {t === 'open' ? `Open${openCount ? ` (${openCount} need an answer)` : ''}` : 'Resolved'}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section aria-label="Reports" className="rounded-xl border border-line bg-white">
          {items === null && <p className="p-5 text-sm text-slate-500">Loading…</p>}
          {items !== null && shown.length === 0 && <p className="p-8 text-center text-sm text-muted">{tab === 'open' ? 'No open reports.' : 'No resolved reports yet.'}</p>}
          <ul className="divide-y divide-line">
            {shown.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => setSelectedId(r.id)} aria-current={selectedId === r.id || undefined}
                  className={`flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 ${selectedId === r.id ? 'bg-slate-50' : ''}`}>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{r.subject}</span>
                    <span className="block text-xs text-muted">{r.customer.name ?? r.customer.clientScopeKey ?? 'Customer'}{r.delivery ? ` · ${r.delivery.title}` : ''} · {new Date(r.updatedAt).toLocaleString()}</span>
                  </span>
                  <StatusBadge status={r.status} label={STATUS_LABEL[r.status]} />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Report" className="rounded-xl border border-line bg-white p-5">
          {!selected && <p className="text-sm text-muted">Choose a report to read it and answer the client.</p>}
          {selected && (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-ink">{selected.subject}</h2>
                  <p className="text-xs text-muted">{selected.customer.name ?? selected.customer.clientScopeKey ?? 'Customer'}{selected.delivery ? ` · about "${selected.delivery.title}"` : ''} · reported {new Date(selected.createdAt).toLocaleString()}</p>
                </div>
                <StatusBadge status={selected.status} label={STATUS_LABEL[selected.status]} />
              </div>

              <ol className="space-y-3 text-sm">
                {selected.messages.map((m) => (
                  <li key={m.id} className={m.internal ? 'rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3' : m.from === 'client' ? 'border-l-2 border-accent pl-3' : 'border-l-2 border-line pl-3'}>
                    <p className="text-slate-700">
                      <span className="font-medium text-ink">{m.from === 'client' ? 'Client' : m.author ?? 'Team'}</span>
                      {m.internal ? ' · internal note (not visible to the client)' : ''} · {new Date(m.at).toLocaleString()}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-slate-700">{m.body}</p>
                  </li>
                ))}
              </ol>

              <div className="grid gap-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-700">{internal ? 'Internal note (management only)' : 'Answer to the client (sent in the company’s name)'}</span>
                  <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} rows={4} aria-label="Message"
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink" />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Internal note, do not send to the client
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={busy || text.trim().length < 1} onClick={() => void act('messages', { body: text.trim(), internal })}
                    className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{internal ? 'Save note' : 'Send answer'}</button>
                  {selected.status !== 'RESOLVED'
                    ? <button type="button" disabled={busy} onClick={() => void act('resolve')} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink disabled:opacity-50">Mark as resolved</button>
                    : <button type="button" disabled={busy} onClick={() => void act('reopen')} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink disabled:opacity-50">Reopen</button>}
                </div>
                {actionError && <p role="alert" className="text-sm text-red-600">{actionError}</p>}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
