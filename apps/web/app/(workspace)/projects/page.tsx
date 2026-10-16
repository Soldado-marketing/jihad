'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DataTable } from '@/components/ui/data-table';
import { FilterBar, useUrlFilters, type FilterBarField } from '@/components/ui/filter-bar';
import { PageHeader } from '@/components/ui/page-header';
import { getStoredUser } from '@/lib/auth';
import { apiFetch } from '@/lib/fetch';
import { applyFilters } from '@/lib/filters';
import {
  budgetLabel,
  canSeeBudget,
  canWriteProjects,
  deadlineDay,
  deadlineState,
  progressLabel,
  projectField,
  PROJECT_STATUSES,
  type ProjectRow,
} from '@/lib/projects';

/**
 * Projects (Blueprint §11; MAOS-T58 table on the T57 fields). Progress is
 * derived from tasks by the API; the budget column exists only for the OWNER,
 * who is the only role the API returns it to.
 */
export default function ProjectsPage() {
  // useSearchParams (the URL-held filters) needs a Suspense boundary.
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <ProjectsList />
    </Suspense>
  );
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-amber-100 text-amber-800',
  ARCHIVED: 'bg-slate-100 text-slate-600',
};
const DEADLINE_CLS = { overdue: 'text-danger font-medium', soon: 'text-amber-700' } as const;
const distinct = (values: (string | null | undefined)[]) =>
  [...new Set(values.map((v) => v?.trim()).filter((v): v is string => Boolean(v)))].sort((a, b) => a.localeCompare(b));

function ProjectsList() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [role, setRole] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [createError, setCreateError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setProjects(await apiFetch<ProjectRow[]>('/projects'));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load projects.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setRole(getStoredUser()?.role);
    void load();
  }, [load]);

  const fields: FilterBarField[] = useMemo(
    () => [
      { key: 'status', label: 'Status', options: [...PROJECT_STATUSES] },
      { key: 'customer', label: 'Customer', options: distinct(projects.map((p) => p.customer?.name)) },
      { key: 'service', label: 'Service', options: distinct(projects.map((p) => p.serviceType)) },
    ],
    [projects],
  );
  const filters = useUrlFilters(fields);
  const visible = applyFilters(projects, filters, projectField, ['name', 'number', 'service', 'customer']);
  const today = new Date().toISOString().slice(0, 10);
  const writer = canWriteProjects(role);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setCreateError('The name needs at least 2 characters.');
      return;
    }
    setCreateError('');
    try {
      await apiFetch('/projects', { method: 'POST', body: JSON.stringify({ name: name.trim() }) });
      setName('');
      setCreating(false);
      void load();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'The project could not be created.');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Project delivery"
        title="Projects"
        description="Track active delivery work and client-visible project boundaries."
        actions={
          writer ? (
            <button onClick={() => setCreating((v) => !v)} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90">
              + New Project
            </button>
          ) : undefined
        }
      />
      {writer && creating && (
        <form onSubmit={handleCreate} className="flex flex-wrap gap-3 rounded-xl border border-line bg-white p-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" maxLength={160}
            className="flex-1 rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Create</button>
          <button type="button" onClick={() => setCreating(false)} className="px-3 py-2 text-sm text-muted">Cancel</button>
          {createError && <p role="alert" className="w-full text-sm text-danger">{createError}</p>}
        </form>
      )}
      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {!loading && !error && projects.length === 0 && (
        <p className="rounded-xl border border-line bg-white p-8 text-center text-sm text-muted">
          No projects yet.{writer ? ' Create your first one above.' : ''}
        </p>
      )}
      {projects.length > 0 && <FilterBar fields={fields} placeholder="Search name, number or service" />}
      {projects.length > 0 && visible.length === 0 && <p className="py-8 text-center text-sm text-muted">No projects match these filters.</p>}
      {visible.length > 0 && (
        <DataTable
          label="Projects"
          rows={visible}
          rowKey={(p) => p.id}
          initialSort={{ key: 'deadline', direction: 'asc' }}
          columns={[
            { key: 'number', header: 'No.', sortValue: (p) => p.projectNumber ?? '', render: (p) => <code className="text-xs text-muted">{p.projectNumber ?? '—'}</code> },
            {
              key: 'name',
              header: 'Project',
              sortValue: (p) => p.name,
              render: (p) => <Link href={`/projects/${p.id}`} className="font-medium text-ink hover:underline">{p.name}</Link>,
            },
            { key: 'customer', header: 'Customer', sortValue: (p) => p.customer?.name ?? '', render: (p) => <span className="text-muted">{p.customer?.name ?? '—'}</span> },
            { key: 'service', header: 'Service', sortValue: (p) => p.serviceType ?? '', render: (p) => <span className="text-muted">{p.serviceType ?? '—'}</span> },
            { key: 'owner', header: 'Responsible', sortValue: (p) => p.owner?.displayName ?? '', render: (p) => <span className="text-muted">{p.owner?.displayName ?? '—'}</span> },
            {
              key: 'progress',
              header: 'Progress',
              sortValue: (p) => p.progress.percent ?? -1,
              render: (p) => <span className="tabular-nums text-muted">{progressLabel(p.progress)}</span>,
            },
            {
              key: 'status',
              header: 'Status',
              sortValue: (p) => p.status,
              render: (p) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[p.status] ?? ''}`}>{p.status}</span>,
            },
            {
              key: 'deadline',
              header: 'Deadline',
              sortValue: (p) => deadlineDay(p.deadline) || '9999',
              render: (p) => {
                const state = deadlineState(p, today);
                return <span className={`tabular-nums ${state ? DEADLINE_CLS[state] : 'text-muted'}`}>{deadlineDay(p.deadline) || '—'}</span>;
              },
            },
            ...(canSeeBudget(role)
              ? [{ key: 'budget', header: 'Budget', align: 'right' as const, sortValue: (p: ProjectRow) => p.budgetCents ?? -1, render: (p: ProjectRow) => <span className="tabular-nums">{budgetLabel(p)}</span> }]
              : []),
          ]}
        />
      )}
    </div>
  );
}
