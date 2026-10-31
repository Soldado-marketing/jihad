'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetch';

type ChannelMember = { userId: string; role: string | null; user: { displayName: string | null; email: string } | null };
type CompanyMember = { id: string; displayName: string | null; email: string; role: string };

/**
 * Who is in a channel (OWNER and MANAGER manage it). A contractor sees a
 * channel only as a member, so this is how they get exactly their channels.
 * The API validates the member and the channel and audits every change.
 */
export function ChannelMembers({ channelId }: { channelId: string }) {
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [people, setPeople] = useState<CompanyMember[]>([]);
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setMembers(await apiFetch<ChannelMember[]>(`/chat/channels/${channelId}/members`));
    } catch {
      setError('Could not load the channel members.');
    }
  }, [channelId]);

  useEffect(() => {
    void load();
    apiFetch<CompanyMember[]>('/users/members')
      .then((rows) => setPeople(rows.filter((p) => p.role !== 'CLIENT')))
      .catch(() => setPeople([]));
  }, [load]);

  async function change(userId: string, add: boolean) {
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/chat/channels/${channelId}/members${add ? '' : `/${encodeURIComponent(userId)}`}`, {
        method: add ? 'POST' : 'DELETE',
        ...(add ? { body: JSON.stringify({ userId }) } : {}),
      });
      setPick('');
      await load();
    } catch {
      setError('The member could not be changed.');
    } finally {
      setBusy(false);
    }
  }

  const inChannel = new Set(members.map((m) => m.userId));
  const candidates = people.filter((p) => !inChannel.has(p.id));
  return (
    <div className="mt-2 space-y-2 text-xs">
      <div className="flex flex-wrap items-center gap-1.5" aria-label="Channel members">
        <span className="text-muted">Members:</span>
        {members.length === 0 && <span className="text-muted">none (contractors see this channel only as members)</span>}
        {members.map((m) => (
          <span key={m.userId} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
            {m.user?.displayName || m.user?.email || 'Member'}
            {m.role === 'CONTRACTOR' && <span className="text-muted">· contractor</span>}
            <button type="button" disabled={busy} onClick={() => void change(m.userId, false)}
              aria-label={`Remove ${m.user?.displayName || m.user?.email || 'member'}`} className="text-muted hover:text-danger">×</button>
          </span>
        ))}
      </div>
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (pick) void change(pick, true); }}>
        <label className="sr-only" htmlFor={`add-member-${channelId}`}>Add a member</label>
        <select id={`add-member-${channelId}`} value={pick} onChange={(e) => setPick(e.target.value)}
          className="min-w-0 max-w-full rounded-lg border border-line px-2 py-1">
          <option value="">Add a member…</option>
          {candidates.map((p) => (
            <option key={p.id} value={p.id}>{p.displayName || p.email} ({p.role.toLowerCase()})</option>
          ))}
        </select>
        <button type="submit" disabled={busy || !pick} className="rounded-lg border border-line px-2 py-1 disabled:opacity-50">Add</button>
      </form>
      {error && <p role="alert" className="text-danger">{error}</p>}
    </div>
  );
}
