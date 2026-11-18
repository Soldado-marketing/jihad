'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/fetch';
import { bulkQuestion, bulkResult, planBulk, type BulkAction } from '@/lib/bulk-tasks';
import { COLUMNS, type Label, type Member, type Project, type Task } from './task-types';

/**
 * The bar above the task list while tasks are selected (MAOS G10): status,
 * assignee, project and label for all of them. Each choice asks first, then
 * sends the editor's own single-task request once per task, one after the
 * other, and says how many were changed. After a full success the selection
 * stays, so a second action can follow; after a partial one only the tasks that
 * could not be changed stay selected. The result sentence is kept by the page,
 * so it is still there when the selection is gone.
 */

type Pending = { action: BulkAction; target: string };
type Progress = { done: number; total: number };
export type BulkOutcome = { text: string; failed: boolean };

const SELECT = 'min-w-0 max-w-full rounded-lg border border-line bg-white px-2 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent/30';
const message = (err: unknown) => (err instanceof Error && err.message ? err.message : 'This could not be completed. Please try again.');

export function BulkBar({
  tasks, members, projects, labels, result, onResult, onClear, onApplied,
}: {
  /** The selected tasks that are shown, in the order shown. */
  tasks: Task[];
  members: Member[];
  projects: Project[];
  labels: Label[];
  result: BulkOutcome | null;
  onResult: (result: BulkOutcome | null) => void;
  onClear: () => void;
  /** Called when an action has run, with the ids that could not be changed (none after a full success). */
  onApplied: (failedIds: string[]) => Promise<void> | void;
}) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  const busy = progress !== null;

  function choose(action: BulkAction, target: string) {
    onResult(null);
    setPending({ action, target });
  }

  async function apply() {
    if (!pending || busy) return;
    const { requests, unchanged } = planBulk(pending.action, tasks);
    setPending(null);
    const failedIds: string[] = [];
    const reasons: string[] = [];
    let done = 0;
    setProgress({ done: 0, total: requests.length });
    // One after the other: each change is its own request with its own record,
    // and a refusal for one task leaves the others as they were stored.
    for (const request of requests) {
      try {
        await apiFetch(request.path, { method: request.method, ...(request.body ? { body: JSON.stringify(request.body) } : {}) });
        done += 1;
      } catch (err) {
        failedIds.push(request.taskId);
        reasons.push(message(err));
      }
      setProgress({ done: done + failedIds.length, total: requests.length });
    }
    await onApplied(failedIds);
    setProgress(null);
    onResult({ text: bulkResult(done, unchanged, reasons), failed: failedIds.length > 0 });
  }

  const memberName = (m: Member) => m.displayName ?? m.email.split('@')[0];

  return (
    <section aria-label="Bulk actions" className="min-w-0 rounded-2xl border border-accent/30 bg-accent/5 px-4 py-3">
      {tasks.length > 0 && (
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-sm font-semibold text-ink" aria-live="polite">{tasks.length} selected</p>

        <select
          aria-label="Set status"
          className={SELECT}
          value=""
          disabled={busy}
          onChange={(e) => {
            const column = COLUMNS.find((c) => c.status === e.target.value);
            if (column) choose({ kind: 'status', status: column.status }, column.label);
          }}
        >
          <option value="">Set status…</option>
          {COLUMNS.map((c) => <option key={c.status} value={c.status}>{c.label}</option>)}
        </select>

        {members.length > 0 && (
          <select
            aria-label="Assign to"
            className={SELECT}
            value=""
            disabled={busy}
            onChange={(e) => {
              const member = members.find((m) => m.id === e.target.value);
              if (member) choose({ kind: 'assign', userId: member.id }, memberName(member));
            }}
          >
            <option value="">Assign to…</option>
            {members.map((m) => <option key={m.id} value={m.id}>{memberName(m)}</option>)}
          </select>
        )}

        {projects.length > 0 && (
          <select
            aria-label="Move to project"
            className={SELECT}
            value=""
            disabled={busy}
            onChange={(e) => {
              const project = projects.find((p) => p.id === e.target.value);
              if (project) choose({ kind: 'move', projectId: project.id }, project.name);
            }}
          >
            <option value="">Move to project…</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}

        {labels.length > 0 && (
          <select
            aria-label="Add label"
            className={SELECT}
            value=""
            disabled={busy}
            onChange={(e) => {
              const label = labels.find((l) => l.id === e.target.value);
              if (label) choose({ kind: 'label', labelId: label.id }, label.name);
            }}
          >
            <option value="">Add label…</option>
            {labels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}

        <button type="button" onClick={onClear} disabled={busy} className="ml-auto text-xs font-medium text-muted hover:text-ink disabled:opacity-50">
          Clear selection
        </button>
      </div>
      )}

      {pending && (
        <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 border-t border-accent/20 pt-3">
          <p className="min-w-0 text-sm text-ink [overflow-wrap:anywhere]">{bulkQuestion(pending.action, tasks.length, pending.target)}</p>
          <button type="button" onClick={() => void apply()} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent">
            Apply
          </button>
          <button type="button" onClick={() => setPending(null)} className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
        </div>
      )}

      {progress && (
        <p role="status" className="mt-3 border-t border-accent/20 pt-3 text-sm text-ink">
          Changing {Math.min(progress.done + 1, progress.total)} of {progress.total}…
        </p>
      )}

      {result && !pending && !progress && (
        <p
          role={result.failed ? 'alert' : 'status'}
          className={`text-sm [overflow-wrap:anywhere] ${tasks.length > 0 ? 'mt-3 border-t border-accent/20 pt-3' : ''} ${result.failed ? 'text-danger' : 'text-ink'}`}
        >
          {result.text}
        </p>
      )}
    </section>
  );
}
