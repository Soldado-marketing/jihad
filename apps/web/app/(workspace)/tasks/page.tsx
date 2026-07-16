'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { apiFetch } from '@/lib/fetch';
import { PageHeader } from '@/components/ui/page-header';
import { KanbanBoard } from '@/components/tasks/kanban-board';
import { ListView } from '@/components/tasks/list-view';
import { CalendarView } from '@/components/tasks/calendar-view';
import { TaskModal } from '@/components/tasks/task-modal';
import {
  Task, TaskStatus, TaskPriority, Member, Project, FileAttachment, Label,
  PRIORITY_META, STATUS_META,
} from '@/components/tasks/task-types';

type View = 'kanban' | 'list' | 'calendar';

// ─── New Task Modal ──────────────────────────────────────────────────────────

type NewTaskFormProps = {
  projects: Project[];
  members: Member[];
  onCreated: () => void;
  onClose: () => void;
};

function NewTaskForm({ projects, members, onCreated, onClose }: NewTaskFormProps) {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [priority, setPriority] = useState<TaskPriority | ''>('');
  const [assigneeId, setAssigneeId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      const body: Record<string, string> = { title: title.trim(), status };
      if (priority) body.priority = priority;
      if (assigneeId) body.assignedToUserId = assigneeId;
      if (projectId) body.projectId = projectId;
      if (dueAt) body.dueAt = dueAt;
      await apiFetch('/tasks', { method: 'POST', body: JSON.stringify(body) });
      onCreated();
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Failed to create task');
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-navy/25 backdrop-blur-[2px] z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg"
      >
        <form
          onSubmit={handleSubmit}
          className="bg-panel rounded-2xl shadow-shell border border-line overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-line flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">New Task</h2>
            <button type="button" onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-canvas transition-colors">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted mb-1.5">
                Title *
              </label>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full rounded-xl border border-line bg-soft px-3 py-2.5 text-sm text-ink placeholder:text-muted/60 outline-none focus:ring-2 focus:ring-accent/30"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="w-full rounded-xl border border-line bg-soft px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                >
                  {(Object.keys(STATUS_META) as TaskStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_META[s].label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted mb-1.5">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority | '')}
                  className="w-full rounded-xl border border-line bg-soft px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                >
                  <option value="">None</option>
                  {(Object.keys(PRIORITY_META) as TaskPriority[]).map((p) => (
                    <option key={p} value={p}>{PRIORITY_META[p].label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted mb-1.5">Assignee</label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full rounded-xl border border-line bg-soft px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.displayName ?? m.email}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  className="w-full rounded-xl border border-line bg-soft px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted mb-1.5">Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-xl border border-line bg-soft px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>
            )}
          </div>

          <div className="px-6 py-4 border-t border-line flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-muted hover:text-ink transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || saving}
              className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-accent transition-colors disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [view, setView] = useState<View>('kanban');
  const [showNewTask, setShowNewTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | ''>('');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | ''>('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterProject, setFilterProject] = useState('');

  const loadAll = useCallback(async () => {
    try {
      const [t, p, m, f, l] = await Promise.all([
        apiFetch<Task[]>('/tasks'),
        apiFetch<Project[]>('/projects').catch(() => [] as Project[]),
        apiFetch<Member[]>('/users/members').catch(() => [] as Member[]),
        apiFetch<FileAttachment[]>('/files').catch(() => [] as FileAttachment[]),
        apiFetch<Label[]>('/labels').catch(() => [] as Label[]),
      ]);
      setTasks(Array.isArray(t) ? t : []);
      setProjects(Array.isArray(p) ? p : []);
      setMembers(Array.isArray(m) ? m : []);
      setFiles(Array.isArray(f) ? f : []);
      setLabels(Array.isArray(l) ? l : []);
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const loadTasks = useCallback(async () => {
    try {
      const t = await apiFetch<Task[]>('/tasks');
      setTasks(Array.isArray(t) ? t : []);
    } catch { /* silent */ }
  }, []);

  const loadFiles = useCallback(async () => {
    try {
      const f = await apiFetch<FileAttachment[]>('/files');
      setFiles(Array.isArray(f) ? f : []);
    } catch { /* silent */ }
  }, []);

  const loadLabels = useCallback(async () => {
    try {
      const l = await apiFetch<Label[]>('/labels');
      setLabels(Array.isArray(l) ? l : []);
    } catch { /* silent */ }
  }, []);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus && t.status !== filterStatus) return false;
      if (filterPriority && t.priority !== filterPriority) return false;
      if (filterAssignee && t.assignedToUserId !== filterAssignee) return false;
      if (filterProject && t.projectId !== filterProject) return false;
      return true;
    });
  }, [tasks, search, filterStatus, filterPriority, filterAssignee, filterProject]);

  const hasFilters = !!(search || filterStatus || filterPriority || filterAssignee || filterProject);

  // Kanban DnD status change
  async function handleStatusChange(taskId: string, status: TaskStatus) {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status } : t));
    try {
      await apiFetch(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    } catch {
      // Revert
      loadTasks();
    }
  }

  // Quick create from kanban column — create then reload to get relations
  async function handleQuickCreate(status: TaskStatus, title: string) {
    await apiFetch('/tasks', {
      method: 'POST',
      body: JSON.stringify({ title, status }),
    });
    await loadTasks();
  }

  // Task updated in modal — optimistic update, then background reload for relations
  function handleTaskUpdated(patch: Partial<Task> & { id: string }) {
    setTasks((prev) => prev.map((t) => t.id === patch.id ? { ...t, ...patch } as Task : t));
    if (selectedTask?.id === patch.id) {
      setSelectedTask((prev) => prev ? { ...prev, ...patch } as Task : null);
    }
    // Silently reload to get fresh relations (project name, assignee name) + any new files
    loadTasks();
    loadFiles();
  }

  // Task deleted
  function handleTaskDeleted(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setSelectedTask(null);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Tasks" title="Task Board" description="Manage work across all projects." />
        <div className="flex items-center gap-3 py-12 justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
            className="w-5 h-5 rounded-full border-2 border-line border-t-accent"
          />
          <span className="text-sm text-muted">Loading tasks…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0 gap-5">
      {/* Page header */}
      <PageHeader
        eyebrow="Tasks"
        title="Task Board"
        description={`${tasks.length} task${tasks.length !== 1 ? 's' : ''} across all projects`}
        actions={
          <button
            onClick={() => setShowNewTask(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-accent transition-colors shadow-[0_2px_8px_rgba(15,118,110,0.3)]"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
            New Task
          </button>
        }
      />

      {error && (
        <p className="text-sm text-danger bg-danger/10 rounded-xl px-4 py-3">{error}</p>
      )}

      {/* Filter + View toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-[280px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M10.5 10.5l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-line rounded-xl bg-soft text-ink placeholder:text-muted/60 outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as TaskStatus | '')}
          className="text-sm border border-line rounded-xl bg-soft px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="">All statuses</option>
          {(Object.keys(STATUS_META) as TaskStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>

        {/* Priority filter */}
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as TaskPriority | '')}
          className="text-sm border border-line rounded-xl bg-soft px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="">All priorities</option>
          {(Object.keys(PRIORITY_META) as TaskPriority[]).map((p) => (
            <option key={p} value={p}>{PRIORITY_META[p].label}</option>
          ))}
        </select>

        {/* Assignee filter */}
        {members.length > 0 && (
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="text-sm border border-line rounded-xl bg-soft px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            <option value="">All assignees</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.displayName ?? m.email}</option>
            ))}
          </select>
        )}

        {/* Project filter */}
        {projects.length > 0 && (
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="text-sm border border-line rounded-xl bg-soft px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}

        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setFilterStatus(''); setFilterPriority(''); setFilterAssignee(''); setFilterProject(''); }}
            className="text-xs text-muted hover:text-danger transition-colors"
          >
            Clear filters
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* View switcher */}
        <div className="flex items-center rounded-xl border border-line bg-soft p-0.5 gap-0.5">
          {(['kanban', 'list', 'calendar'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                view === v
                  ? 'bg-panel text-ink shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {v === 'kanban' && (
                <span className="flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <rect x="1" y="2" width="4" height="12" rx="1.5" fill="currentColor" opacity="0.8"/>
                    <rect x="6" y="2" width="4" height="9" rx="1.5" fill="currentColor" opacity="0.8"/>
                    <rect x="11" y="2" width="4" height="6" rx="1.5" fill="currentColor" opacity="0.8"/>
                  </svg>
                  Board
                </span>
              )}
              {v === 'list' && (
                <span className="flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  List
                </span>
              )}
              {v === 'calendar' && (
                <span className="flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <rect x="1.5" y="2.5" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M1.5 6.5h13M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  Calendar
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filter results count */}
      {hasFilters && (
        <p className="text-xs text-muted -mt-2">
          Showing {filteredTasks.length} of {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Views */}
      <motion.div
        key={view}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="flex-1 flex flex-col min-h-0"
      >
        {view === 'kanban' && (
          <KanbanBoard
            tasks={filteredTasks}
            files={files}
            onTaskOpen={setSelectedTask}
            onStatusChange={handleStatusChange}
            onQuickCreate={handleQuickCreate}
          />
        )}
        {view === 'list' && (
          <ListView tasks={filteredTasks} onTaskOpen={setSelectedTask} />
        )}
        {view === 'calendar' && <CalendarView />}
      </motion.div>

      {/* New Task modal */}
      <AnimatePresence>
        {showNewTask && (
          <NewTaskForm
            projects={projects}
            members={members}
            onCreated={() => { setShowNewTask(false); loadTasks(); }}
            onClose={() => setShowNewTask(false)}
          />
        )}
      </AnimatePresence>

      {/* Task detail side panel */}
      <AnimatePresence>
        {selectedTask && (
          <TaskModal
            task={selectedTask}
            members={members}
            projects={projects}
            allFiles={files}
            allLabels={labels}
            onClose={() => setSelectedTask(null)}
            onUpdated={handleTaskUpdated}
            onDeleted={handleTaskDeleted}
            onLabelCreated={loadLabels}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
