'use client';

import { useState } from 'react';
import { activityLabel } from '@/lib/activity';
import { apiFetch } from '@/lib/fetch';
import { historyActor, historyDetail, type MemberHistoryItem } from '@/lib/member-history';

/**
 * Access history of one member (plan row E02): role and permission changes
 * with who did it and when, loaded only when the OWNER opens it. The API
 * refuses every other role, so nothing here is shown to a client.
 */
export function MemberHistory({ userId }: { userId: string }) {
  const [items, setItems] = useState<MemberHistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (items !== null) return;
    setError(null);
    try {
      const res = await apiFetch<{ items: MemberHistoryItem[] }>(`/audit-events/member/${encodeURIComponent(userId)}`);
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the history.');
    }
  }

  return (
    <details className="mt-3 border-t border-line pt-3" onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) void load(); }}>
      <summary className="min-h-11 cursor-pointer list-none py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        History
      </summary>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {!error && items === null && <p className="text-sm text-slate-500">Loading…</p>}
      {items !== null && items.length === 0 && <p className="text-sm text-slate-500">No role or permission changes recorded yet.</p>}
      {items !== null && items.length > 0 && (
        <ol className="space-y-2 text-sm" aria-label="Access history">
          {items.map((item) => {
            const detail = historyDetail(item.action, item.details);
            return (
              <li key={item.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="font-medium text-ink">{activityLabel(item.action)}</span>
                {detail && <span className="text-slate-700">{detail}</span>}
                <span className="text-xs text-slate-500">
                  by {historyActor(item.actor)} · {new Date(item.createdAt).toLocaleString()}
                  {item.outcome !== 'SUCCESS' ? ` · ${item.outcome.toLowerCase()}` : ''}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </details>
  );
}
