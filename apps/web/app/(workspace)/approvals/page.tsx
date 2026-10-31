'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ErrorState } from '@/components/states/error-state';
import { DetailPanel } from '@/components/ui/detail-panel';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { isOverdue, splitQueue, waitingText, type QueueApproval } from '@/lib/approval-queue';
import { apiFetch } from '@/lib/fetch';

type Decision = 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT';
const DECISIONS: { value: Decision; label: string; className: string }[] = [
  { value: 'APPROVE', label: 'Approve', className: 'bg-accent text-white hover:opacity-90' },
  { value: 'REQUEST_CHANGES', label: 'Request changes', className: 'border border-line bg-white text-ink hover:bg-slate-50' },
  { value: 'REJECT', label: 'Reject', className: 'bg-danger text-white hover:opacity-90' },
];

/** Approval queue (MAOS-T108): what is waiting, most urgent first, and what was decided. */
export default function ApprovalsPage() {
  const [items, setItems] = useState<QueueApproval[] | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'waiting' | 'decided'>('waiting');
  const [selected, setSelected] = useState<QueueApproval | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [decideError, setDecideError] = useState('');
  // Only the OWNER and members made approvers decide; others see the queue read-only.
  const [canDecide, setCanDecide] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setItems(await apiFetch<QueueApproval[]>('/approvals'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load approvals.');
    }
  }, []);

  useEffect(() => {
    void load();
    apiFetch<{ canDecide: boolean }>('/approvals/me')
      .then((me) => setCanDecide(me.canDecide))
      .catch(() => setCanDecide(false));
  }, [load]);

  // A link such as /approvals?open=<id> (Control Center) opens the decision
  // for that request once, if it is waiting in this company's list. A request
  // that is already decided shows under Decided; an unknown id changes nothing.
  const [openId, setOpenId] = useState(() =>
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('open'));
  useEffect(() => {
    if (!items || !openId) return;
    const match = items.find((a) => a.id === openId);
    if (match && splitQueue([match]).waiting.length) {
      setTab('waiting');
      setSelected(match);
    } else if (match) {
      setTab('decided');
    }
    setOpenId(null);
  }, [items, openId]);

  async function decide(decision: Decision) {
    if (!selected) return;
    setBusy(true);
    setDecideError('');
    try {
      await apiFetch(`/approvals/${selected.id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision, ...(note.trim() ? { note: note.trim() } : {}) }),
      });
      setSelected(null);
      setNote('');
      await load();
    } catch (e) {
      // 409: someone else decided it first; reload so the queue is current.
      setDecideError(e instanceof Error ? e.message : 'The decision could not be saved.');
      await load();
    } finally {
      setBusy(false);
    }
  }

  const { waiting, decided } = splitQueue(items ?? []);
  const shown = tab === 'waiting' ? waiting : decided;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Workspace" title="Approvals" description="Decide what is waiting, most urgent first." />

      <div role="tablist" aria-label="Approvals" className="flex gap-1 border-b border-line">
        {(['waiting', 'decided'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === t ? 'border-brand font-medium text-ink' : 'border-transparent text-muted'}`}
          >
            {t === 'waiting' ? `Waiting (${waiting.length})` : `Decided (${decided.length})`}
          </button>
        ))}
      </div>

      {error && <ErrorState title="Could not load approvals" message={error} onRetry={() => void load()} />}
      {!error && items === null && <p className="text-sm text-muted">Loading…</p>}
      {!error && items !== null && shown.length === 0 && (
        <p className="py-8 text-center text-sm text-muted">{tab === 'waiting' ? 'Nothing is waiting for a decision.' : 'No decisions yet.'}</p>
      )}

      {shown.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
          {shown.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <Link href={`/approvals/${a.id}`} className="block truncate text-sm font-medium text-ink hover:underline">
                  {a.title}
                </Link>
                <p className="mt-0.5 text-xs text-muted">
                  {a.fileAsset?.name ? `${a.fileAsset.name} · ` : ''}
                  {isOverdue(a) ? (
                    <span className="font-semibold text-danger">Overdue</span>
                  ) : a.dueAt ? (
                    `Due ${new Date(a.dueAt).toLocaleDateString()}`
                  ) : (
                    waitingText(a.createdAt)
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={a.status} />
                {tab === 'waiting' && canDecide && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(a);
                      setNote('');
                      setDecideError('');
                    }}
                    className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Decide
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!canDecide && items !== null && (
        <p className="text-xs text-muted">You can follow these requests. Decisions are made by the company owner or an approver they choose.</p>
      )}

      <DetailPanel
        open={selected !== null && canDecide}
        onClose={() => setSelected(null)}
        title={selected?.title ?? 'Decision'}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            {DECISIONS.map((d) => (
              <button key={d.value} type="button" disabled={busy} onClick={() => void decide(d.value)} className={`rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 ${d.className}`}>
                {d.label}
              </button>
            ))}
          </div>
        }
      >
        {selected && (
          <div className="space-y-4 text-sm">
            {selected.fileAsset && <p className="text-muted">File: {selected.fileAsset.name}</p>}
            <p className="text-muted">{waitingText(selected.createdAt)}</p>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Note (optional, recommended when rejecting or requesting changes)</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} maxLength={2000} className="w-full rounded-lg border border-line px-3 py-2" />
            </label>
            {decideError && <p role="alert" className="text-sm text-danger">{decideError}</p>}
          </div>
        )}
      </DetailPanel>
    </div>
  );
}
