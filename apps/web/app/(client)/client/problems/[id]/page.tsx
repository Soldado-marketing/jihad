'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { type ClientProblem, PROBLEM_STATUS_LABEL } from '@/lib/client-portal';
import { apiFetch } from '@/lib/fetch';

/** One problem report: what the client wrote, what the company answered, and a box to add more. */
export default function ClientProblemPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<ClientProblem | null>(null);
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setItem(await apiFetch<ClientProblem>(`/client/problems/${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'This report could not be opened.');
    }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  async function send() {
    setBusy(true); setError('');
    try {
      setItem(await apiFetch<ClientProblem>(`/client/problems/${id}/messages`, { method: 'POST', body: JSON.stringify({ body: reply.trim() }) }));
      setReply('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send your message.');
    } finally {
      setBusy(false);
    }
  }

  if (!item && error) return <div className="grid gap-4"><Link href="/client/problems" className="text-sm text-brand hover:underline">← Report a problem</Link><p role="alert" className="text-sm text-red-600">{error}</p></div>;
  if (!item) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="grid gap-6">
      <Link href="/client/problems" className="text-sm text-brand hover:underline">← Report a problem</Link>
      <PageHeader eyebrow={item.delivery ? `About: ${item.delivery.title}` : 'Problem report'} title={item.subject}
        description={`Reported ${new Date(item.createdAt).toLocaleString()}`}
        actions={<StatusBadge status={item.status} label={PROBLEM_STATUS_LABEL[item.status]} />} />

      <section aria-labelledby="thread-title" className="rounded-xl border border-line bg-white p-5">
        <h2 id="thread-title" className="font-semibold text-ink">Conversation</h2>
        <ol className="mt-3 space-y-3 text-sm">
          {item.messages.map((m) => (
            <li key={m.id} className={m.from === 'you' ? 'border-l-2 border-accent pl-3' : 'border-l-2 border-line pl-3'}>
              <p className="text-slate-700"><span className="font-medium text-ink">{m.from === 'you' ? 'You' : 'Our team'}</span> · {new Date(m.at).toLocaleString()}</p>
              <p className="mt-1 whitespace-pre-wrap text-slate-700">{m.body}</p>
            </li>
          ))}
        </ol>
        {item.status === 'RESOLVED' && <p className="mt-4 text-sm text-green-700">This report is resolved. Write below if something is still wrong; that reopens it.</p>}
      </section>

      <section aria-labelledby="reply-title" className="rounded-xl border border-line bg-white p-5">
        <h2 id="reply-title" className="font-semibold text-ink">Add to your report</h2>
        <textarea value={reply} onChange={(e) => setReply(e.target.value)} maxLength={4000} rows={4} aria-label="Your message"
          className="mt-3 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink" />
        <div className="mt-3">
          <button type="button" disabled={busy || reply.trim().length < 1} onClick={() => void send()}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Send</button>
        </div>
        {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      </section>
    </div>
  );
}
