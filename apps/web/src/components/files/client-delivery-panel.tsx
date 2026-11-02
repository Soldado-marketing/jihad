'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetch';
import { StatusBadge } from '@/components/ui/status-badge';
import { type FileVersionListItem } from './file-version-list';

type Round = {
  id: string;
  status: string;
  createdAt: string;
  fileVersion: { id: string; versionNumber: number } | null;
  decisions: { decision: string; note: string | null; createdAt: string; from: 'client' | 'company' }[];
};

const DECISION_TEXT: Record<string, string> = {
  APPROVE: 'Client approved',
  REQUEST_CHANGES: 'Client requested changes',
  CANCEL: 'Revision sent',
  REJECT: 'Rejected',
};

/**
 * Client review of one file (deliveries.service.ts): send a version to the
 * client, read their answer, and resubmit a new version with a reply. The
 * client sees only the company name; the API decides who may send.
 */
export function ClientDeliveryPanel({
  fileAssetId,
  versions,
  onChanged,
}: {
  fileAssetId: string;
  versions: FileVersionListItem[];
  onChanged?: () => void;
}) {
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(() => {
    apiFetch<Round[]>(`/deliveries/file/${fileAssetId}`).then(setRounds).catch(() => setRounds([]));
  }, [fileAssetId]);
  useEffect(() => { load(); }, [load]);

  const latest = versions.filter((v) => v.status === 'ACTIVE').sort((a, b) => b.versionNumber - a.versionNumber)[0];
  const current = rounds?.[0];
  const inReview = current?.status === 'REQUESTED';
  const needsRevision = current?.status === 'CHANGES_REQUESTED';
  const feedback = needsRevision ? [...(current?.decisions ?? [])].reverse().find((d) => d.decision === 'REQUEST_CHANGES') : undefined;
  const hasNewVersion = !!latest && (!current?.fileVersion || latest.versionNumber > current.fileVersion.versionNumber);

  async function send() {
    if (!latest) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      await apiFetch('/deliveries', {
        method: 'POST',
        body: JSON.stringify({ fileAssetId, fileVersionId: latest.id, ...(message.trim() ? { message: message.trim() } : {}) }),
      });
      setMessage('');
      setDone(needsRevision ? 'Revision sent. The client has been notified.' : 'Sent to the client for review. The client has been notified.');
      load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send to the client.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="client-review-title" className="rounded-2xl border border-line bg-white p-6 shadow-lift">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="client-review-title" className="text-lg font-semibold text-ink">Client review</h3>
        {current && <StatusBadge status={current.status} />}
      </div>
      <p className="mt-1 text-sm text-slate-600">
        The client sees this file under the company name only, never yours.
      </p>

      {feedback && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="font-medium text-ink">Changes the client asked for</p>
          <p className="mt-1 whitespace-pre-wrap text-slate-700">{feedback.note}</p>
        </div>
      )}

      {inReview ? (
        <p className="mt-4 text-sm text-slate-600">Version {current?.fileVersion?.versionNumber} is with the client for review.</p>
      ) : current?.status === 'APPROVED' ? (
        <p className="mt-4 text-sm text-green-700">The client approved version {current.fileVersion?.versionNumber}.</p>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">{needsRevision ? 'Reply to the client' : 'Message to the client (optional)'}</span>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} rows={3}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink" />
          </label>
          <button type="button" onClick={() => void send()} disabled={busy || !latest || (needsRevision && !hasNewVersion)}
            className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
            {busy ? 'Sending…' : needsRevision ? `Resubmit version ${latest?.versionNumber ?? ''}` : `Send version ${latest?.versionNumber ?? ''} for client review`}
          </button>
          {needsRevision && !hasNewVersion && <p className="text-xs text-slate-500">Upload a new version with the changes first.</p>}
          {!latest && <p className="text-xs text-slate-500">Upload a version first.</p>}
        </div>
      )}

      {done && <p className="mt-3 text-sm text-green-700">{done}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

      {!!rounds?.length && (
        <ol className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
          {rounds.map((r) => (
            <li key={r.id}>
              <p className="font-medium text-ink">Version {r.fileVersion?.versionNumber ?? '—'} · sent {new Date(r.createdAt).toLocaleString()}</p>
              {r.decisions.map((d, i) => (
                <p key={i} className="mt-1 text-slate-600">
                  {DECISION_TEXT[d.decision] ?? d.decision} · {new Date(d.createdAt).toLocaleString()}
                  {d.note && <span className="block whitespace-pre-wrap text-slate-700">“{d.note}”</span>}
                </p>
              ))}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
