'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/fetch';
import { PageHeader } from '@/components/ui/page-header';
import { getStoredUser } from '@/lib/auth';
import { ProjectProfitabilityPreview } from '@/components/projects/project-profitability-preview';
import {
  budgetLabel,
  canSeeBudget,
  canWriteProjects,
  deadlineDay,
  formFrom,
  progressLabel,
  PROJECT_STATUSES,
  updatePayload,
  type ProjectForm,
  type ProjectRow,
  type ProjectStatus,
} from '@/lib/projects';

type Task = { id: string; title: string; status: string; priority?: string; clientVisible?: boolean };
type Project = ProjectRow & { tasks?: Task[] };
type Option = { id: string; label: string };
const inputCls = 'rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent';

const STATUS_BADGE: Record<string, string> = {
  TODO: 'bg-slate-100 text-slate-600', IN_PROGRESS: 'bg-blue-100 text-blue-700',
  IN_REVIEW: 'bg-purple-100 text-purple-700', DONE: 'bg-green-100 text-green-700',
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [role, setRole] = useState<string | undefined>();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProjectForm | null>(null);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  // null: the caller may not list them (the API refuses); the field is then read-only.
  const [customers, setCustomers] = useState<Option[] | null>(null);
  const [members, setMembers] = useState<Option[] | null>(null);

  useEffect(() => { setRole(getStoredUser()?.role); load(); }, [id]);
  async function load() {
    try { setProject(await apiFetch<Project>(`/projects/${id}`)); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    try {
      await apiFetch('/tasks', { method: 'POST', body: JSON.stringify({ title: taskTitle, projectId: id }) });
      setTaskTitle(''); setAddingTask(false); load();
    } catch (e: any) { alert(e.message); }
  }

  /**
   * The client portal filters on clientVisible, so without this toggle the
   * client's Projects and Tasks pages were empty no matter what was in them.
   */
  async function setProjectVisibility(clientVisible: boolean) {
    setError('');
    try {
      await apiFetch(`/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ clientVisible }),
      });
      await load();
    } catch (e: any) { setError(e.message); }
  }

  async function setTaskVisibility(taskId: string, clientVisible: boolean) {
    setError('');
    try {
      await apiFetch(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ clientVisible }),
      });
      await load();
    } catch (e: any) { setError(e.message); }
  }

  async function startEdit() {
    if (!project) return;
    setForm(formFrom(project));
    setFormError('');
    setEditing(true);
    const [c, m] = await Promise.all([
      apiFetch<{ id: string; name: string; status: string }[]>('/customers').catch(() => null),
      apiFetch<{ id: string; displayName: string | null; email: string; role: string }[]>('/users/members').catch(() => null),
    ]);
    setCustomers(c && c.filter((x) => x.status !== 'ARCHIVED' || x.id === project.customer?.id).map((x) => ({ id: x.id, label: x.name })));
    setMembers(m && m.filter((x) => x.role !== 'CLIENT').map((x) => ({ id: x.id, label: x.displayName || x.email })));
  }

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!project || !form) return;
    const payload = updatePayload(project, form, role);
    if (!payload.ok) { setFormError(payload.error); return; }
    if (Object.keys(payload.body).length === 0) { setEditing(false); return; }
    setBusy(true);
    setFormError('');
    try {
      await apiFetch(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(payload.body) });
      setEditing(false);
      await load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'The project could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteProject() {
    if (!confirm('Delete this project and all its tasks?')) return;
    try {
      await apiFetch(`/projects/${id}`, { method: 'DELETE' });
      window.location.href = '/projects';
    } catch (e: any) { alert(e.message); }
  }

  if (loading) return <p className="text-sm text-muted p-6">Loading…</p>;
  if (error) return <p className="text-sm text-red-500 p-6">{error}</p>;
  if (!project) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={project.clientVisible ? 'Projects · client-visible' : 'Projects · internal'}
        title={project.name}
        description={project.description ?? project.status}
        actions={
          <div className="flex gap-2">
            {canWriteProjects(role) && !editing && (
              <button onClick={startEdit} className="rounded-lg border border-line px-4 py-2 text-sm font-medium">Edit details</button>
            )}
            <button onClick={() => setAddingTask(v => !v)}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">+ Add Task</button>
            <button onClick={() => setProjectVisibility(!project.clientVisible)}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium">
              {project.clientVisible ? 'Make internal' : 'Share with client'}
            </button>
            <button onClick={deleteProject}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50">Delete</button>
          </div>
        }
      />
      {editing && form && (
        <form onSubmit={saveDetails} className="grid gap-3 rounded-xl border border-accent/40 bg-white p-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-muted">Name
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required maxLength={160} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">Status
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ProjectStatus })} className={inputCls}>
              {PROJECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">Project number (empty: assigned automatically on new projects)
            <input value={form.projectNumber} onChange={e => setForm({ ...form, projectNumber: e.target.value })} maxLength={40} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">Service type
            <input value={form.serviceType} onChange={e => setForm({ ...form, serviceType: e.target.value })} maxLength={80} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">Deadline
            <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">Customer
            {customers ? (
              <select value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} className={inputCls}>
                <option value="">— none —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            ) : <span className="py-2 text-sm text-ink">{project.customer?.name ?? '—'}</span>}
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">Responsible
            {members ? (
              <select value={form.ownerUserId} onChange={e => setForm({ ...form, ownerUserId: e.target.value })} className={inputCls}>
                <option value="">— none —</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            ) : <span className="py-2 text-sm text-ink">{project.owner?.displayName ?? '—'}</span>}
          </label>
          {canSeeBudget(role) && (
            <label className="flex flex-col gap-1 text-xs text-muted">Budget (EUR, owner only)
              <input value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} inputMode="decimal" placeholder="1250.00" className={inputCls} />
            </label>
          )}
          {formError && <p role="alert" className="text-sm text-danger sm:col-span-2">{formError}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={busy} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="px-3 py-2 text-sm text-muted">Cancel</button>
          </div>
        </form>
      )}
      <dl className="grid gap-4 rounded-xl border border-line bg-white p-5 text-sm sm:grid-cols-4" aria-label="Project details">
        {[
          ['Number', project.projectNumber ?? '—'],
          ['Customer', project.customer?.name ?? '—'],
          ['Service', project.serviceType ?? '—'],
          ['Responsible', project.owner?.displayName ?? '—'],
          ['Status', project.status],
          ['Deadline', deadlineDay(project.deadline) || '—'],
          ['Progress', progressLabel(project.progress)],
          ...(canSeeBudget(role) ? [['Budget', budgetLabel(project)]] : []),
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs uppercase tracking-wide text-muted">{k}</dt>
            <dd className="mt-1 text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      {canSeeBudget(role) && <ProjectProfitabilityPreview projectId={project.id} />}
      {addingTask && (
        <form onSubmit={addTask} className="flex gap-3 rounded-xl border border-line bg-white p-4">
          <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
            placeholder="Task title" className="flex-1 rounded-lg border border-line px-3 py-2 text-sm" />
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Add</button>
          <button type="button" onClick={() => setAddingTask(false)} className="px-3 text-sm text-muted">Cancel</button>
        </form>
      )}
      <div className="rounded-xl border border-line bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-line bg-slate-50">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Tasks ({project.tasks?.length ?? 0})</h2>
            <Link href={`/projects/${encodeURIComponent(project.id)}/board`} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent">
              Open board
            </Link>
          </div>
        </div>
        {(!project.tasks || project.tasks.length === 0) && (
          <p className="text-center text-sm text-muted py-8">No tasks yet. Add one above.</p>
        )}
        <ul className="divide-y divide-line">
          {project.tasks?.map(t => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
              <p className="text-sm text-ink">
                {t.title}
                <button
                  type="button"
                  onClick={() => setTaskVisibility(t.id, !t.clientVisible)}
                  className="ms-3 rounded-full border border-line px-2 py-0.5 text-xs text-muted"
                >
                  {t.clientVisible ? 'Client-visible' : 'Internal'}
                </button>
              </p>
              <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[t.status] ?? 'bg-slate-100 text-slate-600'}`}>{t.status}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}