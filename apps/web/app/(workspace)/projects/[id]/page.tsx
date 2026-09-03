'use client';
import { use, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetch';
import { PageHeader } from '@/components/ui/page-header';

type Task = { id: string; title: string; status: string; priority?: string; clientVisible?: boolean };
type Project = { id: string; name: string; status: string; description?: string; clientVisible?: boolean; tasks?: Task[]; _count?: { tasks: number } };

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

  useEffect(() => { load(); }, [id]);
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
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Tasks ({project.tasks?.length ?? 0})</h2>
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