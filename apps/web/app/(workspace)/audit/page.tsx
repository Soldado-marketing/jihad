'use client';

import { useCallback, useEffect, useState } from 'react';
import { ErrorState } from '@/components/states/error-state';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { activityLabel } from '@/lib/activity';
import { apiFetch } from '@/lib/fetch';

type AuditRow = {
  id: string;
  action: string;
  outcome: string;
  resourceType: string;
  resourceId: string | null;
  createdAt: string;
  actor: { id: string; displayName: string | null } | null;
};
type Page = { items: AuditRow[]; nextBefore: string | null };

const OUTCOMES = ['', 'SUCCESS', 'FAILURE', 'BLOCKED', 'PARTIAL'];

/** Audit log (MAOS-T132): OWNER only - the API refuses every other role. */
export default function AuditPage() {
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [action, setAction] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [outcome, setOutcome] = useState('');

  const query = useCallback(
    (before?: string) => {
      const qs = new URLSearchParams();
      if (action.trim()) qs.set('action', action.trim());
      if (resourceType.trim()) qs.set('resourceType', resourceType.trim());
      if (outcome) qs.set('outcome', outcome);
      if (before) qs.set('before', before);
      const s = qs.toString();
      return `/audit-events${s ? `?${s}` : ''}`;
    },
    [action, resourceType, outcome],
  );

  const load = useCallback(async () => {
    setError('');
    setRows(null);
    try {
      const page = await apiFetch<Page>(query());
      setRows(page.items);
      setNext(page.nextBefore);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the audit log.');
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  async function loadMore() {
    if (!next) return;
    try {
      const page = await apiFetch<Page>(query(next));
      setRows((r) => [...(r ?? []), ...page.items]);
      setNext(page.nextBefore);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load more.');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Owner" title="Audit log" description="Security-relevant actions in this workspace, newest first." />

      <div role="search" className="flex flex-wrap gap-2">
        <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Action starts with… (e.g. invoice.)" aria-label="Action" maxLength={80} className="min-w-56 flex-1 rounded-lg border border-line px-3 py-2 text-sm" />
        <input value={resourceType} onChange={(e) => setResourceType(e.target.value)} placeholder="Resource type" aria-label="Resource type" maxLength={80} className="w-44 rounded-lg border border-line px-3 py-2 text-sm" />
        <select value={outcome} onChange={(e) => setOutcome(e.target.value)} aria-label="Outcome" className="rounded-lg border border-line px-3 py-2 text-sm">
          {OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {o ? o.charAt(0) + o.slice(1).toLowerCase() : 'All outcomes'}
            </option>
          ))}
        </select>
      </div>

      {error && <ErrorState title="Could not load the audit log" message={error} onRetry={() => void load()} />}
      {!error && rows === null && <p className="text-sm text-muted">Loading…</p>}
      {!error && rows?.length === 0 && <p className="py-8 text-center text-sm text-muted">No events match.</p>}

      {rows && rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[40rem] text-sm" aria-label="Audit events">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-muted">
              <tr>
                {['When', 'Action', 'Resource', 'Who', 'Outcome'].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-4 py-2 text-muted">
                    <time dateTime={r.createdAt}>{new Date(r.createdAt).toLocaleString()}</time>
                  </td>
                  <td className="px-4 py-2 text-ink" title={r.action}>
                    {activityLabel(r.action)}
                  </td>
                  <td className="px-4 py-2 text-muted">{r.resourceType}</td>
                  <td className="px-4 py-2 text-muted">{r.actor?.displayName ?? 'System'}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={r.outcome === 'SUCCESS' ? 'COMPLETED' : r.outcome === 'FAILURE' ? 'FAILED' : r.outcome} label={r.outcome.charAt(0) + r.outcome.slice(1).toLowerCase()} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {next && (
            <div className="border-t border-line p-3 text-center">
              <button type="button" onClick={() => void loadMore()} className="rounded-lg border border-line px-3 py-1.5 text-sm">
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
