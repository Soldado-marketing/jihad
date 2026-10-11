'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ErrorState } from '@/components/states/error-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiFetch } from '@/lib/fetch';
import { dueText, summarizeMyWork, type MyWork, type WorkTask } from '@/lib/my-work';

function TaskList({ title, tasks, empty }: { title: string; tasks: WorkTask[]; empty: string }) {
  return (
    <section className="rounded-xl border border-line bg-white">
      <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">{title}</h2>
      {tasks.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-line">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <Link href={`/tasks/${t.id}`} className="block truncate text-sm font-medium text-ink hover:underline">
                  {t.title}
                </Link>
                <p className="text-xs text-muted">
                  {t.project?.name ? `${t.project.name} · ` : ''}
                  {dueText(t.dueAt)}
                </p>
              </div>
              <StatusBadge status={t.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** My Work (MAOS-T68): the caller's own tasks, decisions, follow-ups and news. */
export default function MyWorkPage() {
  const [data, setData] = useState<MyWork | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setData(await apiFetch<MyWork>('/my-work'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your work.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = data ? summarizeMyWork(data) : null;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Workspace" title="My Work" description="What needs your attention, in one place." />

      {error && <ErrorState title="Could not load your work" message={error} onRetry={() => void load()} />}
      {!data && !error && <p className="text-sm text-muted">Loading…</p>}

      {data && summary && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Overdue" value={summary.counts.overdue} hint="Your tasks past their due date" />
            <KpiCard label="Due this week" value={summary.counts.dueSoon} hint="Due in the next 7 days" />
            <KpiCard label="Blocked" value={summary.counts.blocked} hint="Waiting on something" />
            <KpiCard label="To decide" value={summary.counts.toDecide} hint="Approvals waiting for you" href="/approvals" />
          </div>

          {summary.nothing && (
            <p className="rounded-xl border border-dashed border-line bg-panel p-6 text-center text-sm text-muted">
              Nothing needs your attention right now.
            </p>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <TaskList title="Overdue" tasks={data.tasks.overdue} empty="Nothing overdue." />
            <TaskList title="Due this week" tasks={data.tasks.dueSoon} empty="Nothing due this week." />
            <TaskList title="Blocked" tasks={data.tasks.blocked} empty="Nothing blocked." />
            <TaskList title="Other open tasks" tasks={data.tasks.open} empty="No other open tasks." />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <section className="rounded-xl border border-line bg-white">
              <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">Approvals to decide</h2>
              {data.approvals.toDecide.length === 0 ? (
                <p className="px-4 py-4 text-sm text-muted">None waiting for you.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {data.approvals.toDecide.map((a) => (
                    <li key={a.id} className="px-4 py-3">
                      <Link href={`/approvals/${a.id}`} className="text-sm font-medium text-ink hover:underline">
                        {a.title}
                      </Link>
                      <p className="text-xs text-muted">{dueText(a.dueAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
              {data.approvals.requested.length > 0 && (
                <p className="border-t border-line px-4 py-2 text-xs text-muted">
                  {data.approvals.requested.length} of your own requests still pending.
                </p>
              )}
            </section>

            <section className="rounded-xl border border-line bg-white">
              <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">Follow-ups</h2>
              {data.followUps.length === 0 ? (
                <p className="px-4 py-4 text-sm text-muted">No follow-ups due.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {data.followUps.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-2 px-4 py-3">
                      <span className="truncate text-sm text-ink">{f.title}</span>
                      <span className="shrink-0 text-xs text-muted">{dueText(f.dueAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/crm/follow-ups" className="block border-t border-line px-4 py-2 text-xs text-brand hover:underline">
                All follow-ups
              </Link>
            </section>

            <section className="rounded-xl border border-line bg-white">
              <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">
                Notifications{data.notifications.unread > 0 ? ` (${data.notifications.unread} unread)` : ''}
              </h2>
              {data.notifications.latest.length === 0 ? (
                <p className="px-4 py-4 text-sm text-muted">No notifications.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {data.notifications.latest.map((n) => (
                    <li key={n.id} className={`px-4 py-3 text-sm ${n.status === 'UNREAD' ? 'font-medium text-ink' : 'text-muted'}`}>
                      {n.title}
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/notifications" className="block border-t border-line px-4 py-2 text-xs text-brand hover:underline">
                All notifications
              </Link>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
