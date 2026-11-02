'use client';

import Link from 'next/link';
import { use, useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiBlob, apiFetch, saveBlob } from '@/lib/fetch';
import { DELIVERY_STATUS_LABEL, threadLine } from '@/lib/deliveries';

type Detail = {
  id: string;
  title: string;
  status: string;
  company: string;
  project: { id: string; name: string } | null;
  file: { fileAssetId: string; fileVersionId: string | null; versionNumber: number | null; name: string; sizeBytes: number | null };
  canDecide: boolean;
  thread: { at: string; from: 'client' | 'company'; kind: string; note: string | null; versionNumber: number | null }[];
};

/** One delivery: open the file, read the conversation, approve or request changes. */
export default function ClientDeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(() => {
    apiFetch<Detail>(`/client/deliveries/${id}`)
      .then(setD)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load this delivery.'));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function download(mode: 'inline' | 'attachment') {
    if (!d?.file.fileVersionId) return;
    setError(null);
    try {
      const { blob, filename } = await apiBlob(
        `/client/files/${d.file.fileAssetId}/versions/${d.file.fileVersionId}/content?disposition=${mode}`,
        d.file.name,
      );
      if (mode === 'attachment') return saveBlob(blob, filename);
      if (!window.open(URL.createObjectURL(blob), '_blank')) saveBlob(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the file.');
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
      setDone(decision === 'APPROVE' ? 'Thank you, the delivery is approved.' : 'Thank you, we will work on your changes and send a revision.');
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
      <Link href="/client/deliveries" className="text-sm text-brand hover:underline">← All deliveries</Link>
      <PageHeader eyebrow={d.project?.name ?? 'Delivery'} title={d.title} description={`Delivered by ${d.company}`} />

      <section className="rounded-xl border border-line bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 text-sm text-slate-700">
            <span className="font-medium text-ink">{d.file.name}</span>
            {d.file.versionNumber ? ` · Version ${d.file.versionNumber}` : ''}
          </p>
          <StatusBadge status={d.status} label={DELIVERY_STATUS_LABEL[d.status]} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => void download('inline')} className="rounded-lg border border-line px-3 py-1.5 text-sm">View</button>
          <button type="button" onClick={() => void download('attachment')} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white">Download</button>
        </div>
      </section>

      {d.canDecide && (
        <section aria-labelledby="your-answer" className="rounded-xl border border-line bg-white p-5">
          <h2 id="your-answer" className="font-semibold text-ink">Your answer</h2>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block text-slate-700">Comments (required when you ask for changes)</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} rows={4}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink" />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => void decide('APPROVE')}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Approve</button>
            <button type="button" disabled={busy || note.trim().length < 2} onClick={() => void decide('REQUEST_CHANGES')}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink disabled:opacity-50">Request changes</button>
          </div>
        </section>
      )}
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
    </div>
  );
}
