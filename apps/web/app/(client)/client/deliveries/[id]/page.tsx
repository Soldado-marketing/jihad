'use client';

import Link from 'next/link';
import { use, useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { apiBlob, apiFetch, saveBlob } from '@/lib/fetch';
import { DELIVERY_STATUS_LABEL, reviewByLine, threadLine } from '@/lib/deliveries';
import { KIND_LABEL } from '@/lib/client-portal';

type Detail = {
  id: string;
  title: string;
  status: string;
  reviewBy: string | null;
  company: string;
  project: { id: string; name: string } | null;
  file: { fileAssetId: string; fileVersionId: string | null; versionNumber: number | null; name: string; sizeBytes: number | null; kind?: 'image' | 'pdf' | 'video' | 'link' | 'document' };
  canDecide: boolean;
  thread: { at: string; from: 'client' | 'company'; kind: string; note: string | null; versionNumber: number | null }[];
};

/** One delivery: see it in the page, download it, approve it or ask for a revision. */
export default function ClientDeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; type: string } | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [confirmApprove, setConfirmApprove] = useState(false);

  const load = useCallback(() => {
    apiFetch<Detail>(`/client/deliveries/${id}`)
      .then(setD)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load this delivery.'));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const contentPath = d?.file.fileVersionId ? `/client/files/${d.file.fileAssetId}/versions/${d.file.fileVersionId}/content` : null;
  const kind = d?.file.kind ?? 'document';

  // The preview is the same prepared copy a download gives (identifying metadata removed).
  useEffect(() => {
    if (!contentPath || kind === 'document') return;
    let url: string | null = null;
    apiBlob(`${contentPath}?disposition=inline`, d?.file.name ?? 'file')
      .then(async ({ blob }) => {
        if (kind === 'link') {
          const m = /^URL=(https:\/\/\S+)\s*$/m.exec(await blob.text());
          setLink(m ? m[1] : null);
          return;
        }
        url = URL.createObjectURL(blob);
        setPreview({ url, type: blob.type });
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not show this delivery.'));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [contentPath, kind, d?.file.name]);

  async function download() {
    if (!contentPath || !d) return;
    setError(null);
    try {
      const { blob, filename } = await apiBlob(`${contentPath}?disposition=attachment`, d.file.name);
      saveBlob(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download the file.');
    }
  }

  async function decide(decision: 'APPROVE' | 'REQUEST_CHANGES') {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/client/deliveries/${id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision, ...(note.trim() ? { note: note.trim() } : {}) }),
      });
      setNote('');
      setConfirmApprove(false);
      setDone(decision === 'APPROVE' ? 'Thank you, the delivery is approved.' : 'Thank you, we will work on your revision and send a new version.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your answer could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  if (error && !d) return <p role="alert" className="text-sm text-red-600">{error}</p>;
  if (!d) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="grid gap-6">
      <Link href="/client/deliveries" className="text-sm text-brand hover:underline">← My Work</Link>
      <PageHeader eyebrow={d.project?.name ?? 'Delivery'} title={d.title} description={`Delivered by ${d.company}`} />

      <section className="grid gap-4 rounded-xl border border-line bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 text-sm text-slate-700">
            <span className="font-medium text-ink">{KIND_LABEL[kind]}</span>
            {d.file.versionNumber ? ` · Version ${d.file.versionNumber}` : ''}
          </p>
          <StatusBadge status={d.status} label={DELIVERY_STATUS_LABEL[d.status]} />
        </div>
        {(() => {
          const due = reviewByLine(d.reviewBy, d.status);
          return due ? <p className={`text-sm ${due.urgent ? 'font-medium text-amber-700' : 'text-slate-600'}`}>{due.text}</p> : null;
        })()}

        {preview && kind === 'image' && <img src={preview.url} alt={d.title} className="max-h-[70vh] w-full rounded-lg border border-line object-contain" />}
        {preview && kind === 'video' && <video src={preview.url} controls playsInline className="max-h-[70vh] w-full rounded-lg border border-line bg-black" />}
        {preview && kind === 'pdf' && <iframe src={preview.url} title={d.title} className="h-[70vh] w-full rounded-lg border border-line" />}
        {kind === 'link' && (link
          ? <a href={link} target="_blank" rel="noopener noreferrer" className="inline-block w-fit rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Open link ({new URL(link).hostname})</a>
          : <p className="text-sm text-slate-500">Loading the link…</p>)}
        {kind === 'document' && <p className="text-sm text-slate-600">This file cannot be shown in the page. Download it to open it.</p>}

        {kind !== 'link' && (
          <div>
            <button type="button" onClick={() => void download()} className="rounded-lg border border-line px-3 py-1.5 text-sm">Download</button>
          </div>
        )}
      </section>

      {d.canDecide && (
        <section aria-labelledby="your-answer" className="rounded-xl border border-line bg-white p-5">
          <h2 id="your-answer" className="font-semibold text-ink">Your answer</h2>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block text-slate-700">What should we change? (needed for a revision)</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} rows={4}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink" />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => setConfirmApprove(true)}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Approve</button>
            <button type="button" disabled={busy || note.trim().length < 2} onClick={() => void decide('REQUEST_CHANGES')}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink disabled:opacity-50">Request revision</button>
          </div>
        </section>
      )}
      <p className="text-xs text-slate-500">
        Not about the work itself, but about how things went? <Link href={`/client/problems?delivery=${encodeURIComponent(d.id)}`} className="text-brand hover:underline">Report a problem to our management</Link>.
      </p>
      {done && <p className="text-sm text-green-700">{done}</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <section aria-labelledby="conversation" className="rounded-xl border border-line bg-white p-5">
        <h2 id="conversation" className="font-semibold text-ink">Conversation</h2>
        <ol className="mt-3 space-y-3 text-sm">
          {d.thread.map((t, i) => (
            <li key={i} className={t.from === 'client' ? 'border-l-2 border-accent pl-3' : 'border-l-2 border-line pl-3'}>
              <p className="text-slate-700">
                <span className="font-medium text-ink">{threadLine(t.kind, t.from, d.company)}</span>
                {t.versionNumber ? ` · Version ${t.versionNumber}` : ''} · {new Date(t.at).toLocaleString()}
              </p>
              {t.note && <p className="mt-1 whitespace-pre-wrap text-slate-700">{t.note}</p>}
            </li>
          ))}
        </ol>
      </section>

      {confirmApprove && (
        <ConfirmDialog title="Approve this delivery?" confirmLabel="Approve" busy={busy}
          onCancel={() => setConfirmApprove(false)} onConfirm={() => void decide('APPROVE')}>
          <p>Approving tells us the work is final. You can still download it later from My Work.</p>
          {note.trim() && <p>Your comment will be sent with the approval.</p>}
        </ConfirmDialog>
      )}
    </div>
  );
}
