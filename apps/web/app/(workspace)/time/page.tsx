'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { FilterBar, useUrlFilters, type FilterBarField } from '@/components/ui/filter-bar';
import { PageHeader } from '@/components/ui/page-header';
import { getStoredUser, type StoredUser } from '@/lib/auth';
import { apiFetch } from '@/lib/fetch';
import { applyFilters } from '@/lib/filters';
import { formatCents } from '@/lib/money';
import {
  canDecide,
  canLogTime,
  canReview,
  canSeeCost,
  canSubmit,
  createPayload,
  formatMinutes,
  formFrom,
  isEditable,
  listQuery,
  STATUS_LABEL,
  TIME_ENTRY_STATUSES,
  totals,
  updatePayload,
  type EntryForm,
  type TimeEntry,
  type TimeEntryStatus,
} from '@/lib/time-entries';

/**
 * Time & Costs (MAOS-T76; Blueprint §15) over the T72 API. Everyone logs and
 * edits their own time; OWNER and MANAGER see and review everyone's. Rates and
 * costs come only from the API, which sends them to the OWNER only.
 */
export default function TimePage() {
  // useSearchParams (the URL-held filters) needs a Suspense boundary.
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <Timesheet />
    </Suspense>
  );
}

type Project = { id: string; name: string; projectNumber: string | null; status: string };
type Task = { id: string; title: string };

const STATUS_BADGE: Record<TimeEntryStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  BILLED: 'bg-purple-100 text-purple-700',
  REJECTED: 'bg-amber-100 text-amber-800',
};
const inputCls = 'rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent';
const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = (): EntryForm => ({ date: today(), duration: '', projectId: '', taskId: '', billable: true, note: '' });

function Timesheet() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState({ from: '', to: '' });
  const [form, setForm] = useState<EntryForm>(emptyForm);
  const [editing, setEditing] = useState<TimeEntry | null>(null);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const role = user?.role;
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setEntries(await apiFetch<TimeEntry[]>(`/time-entries${listQuery(range)}`));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load time entries.');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    setUser(getStoredUser());
    apiFetch<Project[]>('/projects').then((p) => setProjects(p.filter((x) => x.status !== 'ARCHIVED'))).catch(() => setProjects([]));
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!form.projectId) {
      setTasks([]);
      return;
    }
    apiFetch<Task[]>(`/tasks?projectId=${encodeURIComponent(form.projectId)}`).then(setTasks).catch(() => setTasks([]));
  }, [form.projectId]);

  const people = useMemo(() => [...new Map(entries.map((e) => [e.user.id, e.user.displayName ?? e.user.id])).values()].sort(), [entries]);
  const fields: FilterBarField[] = useMemo(
    () => [
      { key: 'status', label: 'Status', options: [...TIME_ENTRY_STATUSES], optionLabel: (v) => STATUS_LABEL[v as TimeEntryStatus] ?? v },
      { key: 'project', label: 'Project', options: [...new Set(entries.map((e) => e.project.name))].sort() },
      ...(canReview(role) ? [{ key: 'member', label: 'Member', options: people }] : []),
    ],
    [entries, people, role],
  );
  const filters = useUrlFilters(fields);
  const visible = applyFilters(
    entries,
    filters,
    (e, key) => (key === 'status' ? e.status : key === 'project' ? e.project.name : key === 'member' ? (e.user.displayName ?? e.user.id) : key === 'note' ? e.note : null),
    ['project', 'note', 'member'],
  );
  const sum = totals(visible);
  const owner = canSeeCost(role);

  function startEdit(e: TimeEntry) {
    setEditing(e);
    setForm(formFrom(e));
    setFormError('');
  }
  function cancel() {
    setEditing(null);
    setForm(emptyForm());
    setFormError('');
  }

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    const payload = editing ? updatePayload(editing, form) : createPayload(form);
    if (!payload.ok) {
      setFormError(payload.error);
      return;
    }
    if (editing && Object.keys(payload.body).length === 0) {
      cancel();
      return;
    }
    setBusy(true);
    setFormError('');
    try {
      await apiFetch(editing ? `/time-entries/${editing.id}` : '/time-entries', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload.body) });
      cancel();
      await load();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'The entry could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  async function act(e: TimeEntry, action: 'submit' | 'approve' | 'reject' | 'delete') {
    if (action === 'delete' && !confirm('Delete this time entry?')) return;
    let body: string | undefined = '{}';
    if (action === 'reject') {
      const reason = prompt('Reason for the member (optional):') ?? '';
      body = JSON.stringify(reason.trim() ? { reason: reason.trim().slice(0, 500) } : {});
    }
    setError('');
    try {
      await apiFetch(action === 'delete' ? `/time-entries/${e.id}` : `/time-entries/${e.id}/${action}`, { method: action === 'delete' ? 'DELETE' : 'POST', body: action === 'delete' ? undefined : body });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'The action failed.');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Time & Costs"
        title="Timesheet"
        description={canReview(role) ? 'Your time and your team’s. Review submitted entries.' : 'Log your time. Submit an entry when it is complete.'}
      />

      {canLogTime(role) && (
        <form onSubmit={save} className={`grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-6 ${editing ? 'border-accent/40' : 'border-line'}`} aria-label={editing ? 'Edit time entry' : 'Log time'}>
          <label className="flex flex-col gap-1 text-xs text-muted">Date
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} required />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">Duration (h:mm or minutes)
            <input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="1:30" inputMode="decimal" className={inputCls} required />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted sm:col-span-2">Project
            <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value, taskId: '' })} className={inputCls} required>
              <option value="">— choose —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.projectNumber ? `${p.projectNumber} · ` : ''}{p.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted sm:col-span-2">Task (optional)
            <select value={form.taskId} onChange={(e) => setForm({ ...form, taskId: e.target.value })} className={inputCls} disabled={!form.projectId}>
              <option value="">— none —</option>
              {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted sm:col-span-4">Note (optional)
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={2000} className={inputCls} />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink sm:col-span-1">
            <input type="checkbox" checked={form.billable} onChange={(e) => setForm({ ...form, billable: e.target.checked })} /> Billable
          </label>
          <div className="flex items-end gap-2 sm:col-span-1">
            <button type="submit" disabled={busy} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{editing ? 'Save' : 'Log time'}</button>
            {editing && <button type="button" onClick={cancel} className="px-2 py-2 text-sm text-muted">Cancel</button>}
          </div>
          {formError && <p role="alert" className="text-sm text-danger sm:col-span-6">{formError}</p>}
        </form>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">From
          <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">To
          <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} className={inputCls} />
        </label>
      </div>
      {entries.length > 0 && <FilterBar fields={fields} placeholder="Search project, note or member" />}

      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {!loading && !error && entries.length === 0 && <p className="py-8 text-center text-sm text-muted">No time logged in this period.</p>}

      {visible.length > 0 && (
        <>
          <dl className="grid gap-4 rounded-xl border border-line bg-white p-4 text-sm sm:grid-cols-4" aria-label="Totals">
            <div><dt className="text-xs text-muted">Hours</dt><dd className="tabular-nums text-ink">{formatMinutes(sum.minutes)}</dd></div>
            <div><dt className="text-xs text-muted">Billable</dt><dd className="tabular-nums text-ink">{formatMinutes(sum.billableMinutes)}</dd></div>
            {owner && <div><dt className="text-xs text-muted">Labour cost (owner only)</dt><dd className="tabular-nums text-ink">{formatCents(sum.costCents)}</dd></div>}
            {owner && sum.unratedMinutes > 0 && (
              <div><dt className="text-xs text-muted">Without a rate</dt><dd className="tabular-nums text-amber-700">{formatMinutes(sum.unratedMinutes)} — cost unknown</dd></div>
            )}
          </dl>
          <DataTable
            label="Time entries"
            rows={visible}
            rowKey={(e) => e.id}
            initialSort={{ key: 'date', direction: 'desc' }}
            columns={[
              { key: 'date', header: 'Date', sortValue: (e) => e.date, render: (e) => <span className="tabular-nums">{e.date}</span> },
              ...(canReview(role) ? [{ key: 'member', header: 'Member', sortValue: (e: TimeEntry) => e.user.displayName ?? '', render: (e: TimeEntry) => <span className="text-muted">{e.user.displayName ?? '—'}</span> }] : []),
              { key: 'project', header: 'Project', sortValue: (e) => e.project.name, render: (e) => <span className="text-ink">{e.project.name}{e.task ? <span className="block text-xs text-muted">{e.task.title}</span> : null}</span> },
              { key: 'minutes', header: 'Time', align: 'right', sortValue: (e) => e.minutes, render: (e) => <span className="tabular-nums">{formatMinutes(e.minutes)}{e.billable ? '' : <span className="ms-1 text-xs text-muted">non-billable</span>}</span> },
              { key: 'status', header: 'Status', sortValue: (e) => e.status, render: (e) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[e.status]}`}>{STATUS_LABEL[e.status]}</span> },
              ...(owner
                ? [{
                    key: 'cost',
                    header: 'Cost',
                    align: 'right' as const,
                    sortValue: (e: TimeEntry) => e.costCents ?? -1,
                    render: (e: TimeEntry) => (e.costCents === null || e.costCents === undefined ? <span className="text-xs text-amber-700">unrated</span> : <span className="tabular-nums">{formatCents(e.costCents)}</span>),
                  }]
                : []),
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (e) => (
                  <span className="flex justify-end gap-2 text-xs">
                    {canSubmit(e, user?.id) && <button onClick={() => void act(e, 'submit')} className="text-accent hover:underline">Submit</button>}
                    {isEditable(e, user?.id) && <button onClick={() => startEdit(e)} className="text-accent hover:underline">Edit</button>}
                    {isEditable(e, user?.id) && <button onClick={() => void act(e, 'delete')} className="text-danger hover:underline">Delete</button>}
                    {canDecide(e, role) && <button onClick={() => void act(e, 'approve')} className="text-green-700 hover:underline">Approve</button>}
                    {canDecide(e, role) && <button onClick={() => void act(e, 'reject')} className="text-amber-700 hover:underline">Reject</button>}
                  </span>
                ),
              },
            ]}
          />
        </>
      )}
    </div>
  );
}
