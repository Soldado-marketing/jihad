'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Task, TaskStatus, TaskPriority, Member, Project, Subtask, FileAttachment,
  Label,
  STATUS_META, PRIORITY_META, getInitials, avatarColor, formatDueDate,
} from './task-types';
import { apiFetch } from '@/lib/fetch';

// ─── Types ────────────────────────────────────────────────────────────────────

type InternalNote = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; displayName: string | null } | null;
};

type SectionKey = 'labels' | 'notes';
type SectionState = 'hidden' | 'collapsed' | 'open';

const LABEL_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#0ea5e9', '#6366f1', '#a855f7', '#ec4899',
  '#64748b', '#0f766e',
];

// ─── Props ────────────────────────────────────────────────────────────────────

type TaskModalProps = {
  task: Task;
  members: Member[];
  projects: Project[];
  allFiles: FileAttachment[];
  allLabels: Label[];
  onClose: () => void;
  onUpdated: (updated: Partial<Task> & { id: string }) => void;
  onDeleted: (taskId: string) => void;
  onLabelCreated?: () => void;
};

// ─── SubtaskRow ───────────────────────────────────────────────────────────────

function SubtaskRow({
  sub,
  onToggle,
  onRequestDelete,
  isConfirmingDelete,
  onConfirmDelete,
  onCancelDelete,
  isDeleting,
}: {
  sub: Subtask;
  onToggle: (id: string, done: boolean) => void;
  onRequestDelete: (id: string) => void;
  isConfirmingDelete: boolean;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
  isDeleting: boolean;
}) {
  const done = sub.status === 'DONE';
  return (
    <div className="flex items-center gap-2.5 py-1.5 group">
      <input
        type="checkbox"
        checked={done}
        onChange={(e) => onToggle(sub.id, e.target.checked)}
        className="w-4 h-4 rounded border-line accent-accent shrink-0"
        disabled={isDeleting}
      />
      <span className={`text-sm flex-1 leading-snug ${done ? 'line-through text-muted' : 'text-ink'}`}>
        {sub.title}
      </span>

      {isConfirmingDelete ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onConfirmDelete(sub.id)}
            disabled={isDeleting}
            className="text-[11px] text-danger font-semibold hover:underline disabled:opacity-50"
          >
            {isDeleting ? '…' : 'Delete'}
          </button>
          <button
            onClick={onCancelDelete}
            className="text-[11px] text-muted hover:text-ink"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => onRequestDelete(sub.id)}
          className="w-6 h-6 flex items-center justify-center text-muted opacity-0 group-hover:opacity-100 hover:text-danger transition-all rounded shrink-0"
          title="Delete item"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M5 4V2.5A.5.5 0 015.5 2h5a.5.5 0 01.5.5V4M6 7v5M10 7v5M3 4l.8 8.2A1 1 0 004.8 13h6.4a1 1 0 001-.8L13 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

function SectionHeader({
  label,
  badge,
  collapsed,
  onToggle,
}: {
  label: string;
  badge?: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 group w-full text-left mb-2"
    >
      <svg
        width="12" height="12" viewBox="0 0 12 12" fill="none"
        className={`text-muted transition-transform duration-150 ${collapsed ? '-rotate-90' : ''}`}
      >
        <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted group-hover:text-ink transition-colors">
        {label}
        {badge !== undefined && badge > 0 && (
          <span className="ml-2 font-normal text-ink">{badge}</span>
        )}
      </span>
    </button>
  );
}

// ─── NoteItem ─────────────────────────────────────────────────────────────────

function NoteItem({ note }: { note: InternalNote }) {
  const author = note.createdBy;
  const initials = author?.displayName
    ? author.displayName.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  const dateStr = new Date(note.createdAt).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
  });
  const timeStr = new Date(note.createdAt).toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="flex gap-3">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
        style={{ backgroundColor: '#0f766e' }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-xs font-semibold text-ink">
            {author?.displayName ?? 'Unknown'}
          </span>
          <span className="text-[11px] text-muted">{dateStr} {timeStr}</span>
        </div>
        <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{note.body}</p>
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function TaskModal({
  task,
  members,
  projects,
  allFiles,
  allLabels,
  onClose,
  onUpdated,
  onDeleted,
  onLabelCreated,
}: TaskModalProps) {
  // ── Form state ──
  const [title, setTitle]         = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [status, setStatus]       = useState<TaskStatus>(task.status);
  const [priority, setPriority]   = useState<TaskPriority | ''>(task.priority ?? '');
  const [assigneeId, setAssigneeId] = useState(task.assignedToUserId ?? '');
  const [projectId, setProjectId] = useState(task.projectId ?? '');
  const [dueAt, setDueAt]         = useState(task.dueAt ? task.dueAt.slice(0, 10) : '');
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState('');
  const [dirty, setDirty]         = useState(false);

  // ── Subtasks ──
  const [subtasks, setSubtasks]       = useState<Subtask[]>([]);
  const [subLoading, setSubLoading]   = useState(true);
  const [newSubTitle, setNewSubTitle] = useState('');
  const [addingSub, setAddingSub]     = useState(false);
  const [subTitleError, setSubTitleError] = useState('');
  const [confirmDeleteSub, setConfirmDeleteSub] = useState<string | null>(null);
  const [deletingSub, setDeletingSub] = useState<string | null>(null);

  // ── Labels ──
  const [taskLabels, setTaskLabels] = useState<Label[]>(
    () => task.labels?.map((e) => e.label) ?? [],
  );
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [labelSearch, setLabelSearch]         = useState('');
  const [showCreateLabel, setShowCreateLabel] = useState(false);
  const [newLabelName, setNewLabelName]       = useState('');
  const [newLabelColor, setNewLabelColor]     = useState(LABEL_COLORS[0]);
  const [creatingLabel, setCreatingLabel]     = useState(false);
  const [labelError, setLabelError]           = useState('');
  const [togglingLabelId, setTogglingLabelId] = useState<string | null>(null);

  // ── Notes ──
  const [notes, setNotes]             = useState<InternalNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [newNoteBody, setNewNoteBody] = useState('');
  const [addingNote, setAddingNote]   = useState(false);
  const [noteError, setNoteError]     = useState('');

  // ── Optional sections ──
  const [sections, setSections] = useState<Record<SectionKey, SectionState>>(() => ({
    labels: (task.labels?.length ?? 0) > 0 ? 'open' : 'hidden',
    notes: 'hidden',
  }));
  const [showAddMenu, setShowAddMenu] = useState(false);

  // ── Always-visible section collapse state ──
  const [checklistCollapsed, setChecklistCollapsed]     = useState(false);
  const [attachmentsCollapsed, setAttachmentsCollapsed] = useState(false);

  // ── Attachments ──
  const attachments = allFiles.filter((f) => f.taskId === task.id);
  const [newFileName, setNewFileName] = useState('');
  const [addingFile, setAddingFile]   = useState(false);
  const [fileError, setFileError]     = useState('');

  // ── Delete task ──
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);

  const titleRef = useRef<HTMLTextAreaElement>(null);

  // ── Load subtasks ──
  useEffect(() => {
    setSubLoading(true);
    apiFetch<Subtask[]>(`/tasks/${task.id}/subtasks`)
      .then((data) => setSubtasks(Array.isArray(data) ? data : []))
      .catch(() => setSubtasks([]))
      .finally(() => setSubLoading(false));
  }, [task.id]);

  // ── Load notes when section first opened ──
  const loadNotes = useCallback(async () => {
    setNotesLoading(true);
    setNoteError('');
    try {
      const data = await apiFetch<InternalNote[]>(
        `/collaboration/notes?resourceType=task&resourceId=${task.id}`,
      );
      setNotes(Array.isArray(data) ? data : []);
      setNotesLoaded(true);
    } catch {
      setNotes([]);
    } finally {
      setNotesLoading(false);
    }
  }, [task.id]);

  const notesSection = sections.notes;
  useEffect(() => {
    if (notesSection === 'open' && !notesLoaded) {
      loadNotes();
    }
  }, [notesSection, notesLoaded, loadNotes]);

  // ── Mark dirty ──
  function mark<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setDirty(true); };
  }

  // ── Save task ──
  const handleSave = useCallback(async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    setSaveError('');
    try {
      const bodyToSend: Record<string, unknown> = {
        title: title.trim(),
        // Explicitly send null when description is cleared so the backend sets NULL
        description: description.trim() !== '' ? description.trim() : null,
        status,
      };
      if (priority) bodyToSend.priority = priority;
      if (assigneeId) bodyToSend.assignedToUserId = assigneeId;
      if (projectId) bodyToSend.projectId = projectId;
      if (dueAt) bodyToSend.dueAt = dueAt;

      const updated = await apiFetch<Partial<Task>>(`/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify(bodyToSend),
      });
      onUpdated({ id: task.id, ...updated });
      setDirty(false);
    } catch (e: unknown) {
      setSaveError((e as Error).message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [title, description, status, priority, assigneeId, projectId, dueAt, saving, task.id, onUpdated]);

  // ── Toggle subtask ──
  async function toggleSub(id: string, done: boolean) {
    const newStatus: TaskStatus = done ? 'DONE' : 'TODO';
    setSubtasks((prev) => prev.map((s) => s.id === id ? { ...s, status: newStatus } : s));
    try {
      await apiFetch(`/subtasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      setSubtasks((prev) => prev.map((s) => s.id === id ? { ...s, status: done ? 'TODO' : 'DONE' } : s));
    }
  }

  // ── Add subtask (with min-2-char validation) ──
  async function addSubtask() {
    const t = newSubTitle.trim();
    setSubTitleError('');
    if (t.length < 2) {
      setSubTitleError('Title must be at least 2 characters');
      return;
    }
    if (addingSub) return;
    setAddingSub(true);
    try {
      const created = await apiFetch<Subtask>(`/tasks/${task.id}/subtasks`, {
        method: 'POST',
        body: JSON.stringify({ title: t }),
      });
      setSubtasks((prev) => [...prev, created]);
      setNewSubTitle('');
    } catch {
      // silent — server validation will surface errors if needed
    } finally {
      setAddingSub(false);
    }
  }

  // ── Delete subtask ──
  async function deleteSub(id: string) {
    setDeletingSub(id);
    try {
      await apiFetch(`/subtasks/${id}`, { method: 'DELETE' });
      setSubtasks((prev) => prev.filter((s) => s.id !== id));
      setConfirmDeleteSub(null);
      onUpdated({ id: task.id }); // refresh parent so _count updates
    } catch {
      // silent
    } finally {
      setDeletingSub(null);
    }
  }

  // ── Toggle label on/off ──
  async function toggleLabel(label: Label) {
    const isAssigned = taskLabels.some((l) => l.id === label.id);
    const newLabels = isAssigned
      ? taskLabels.filter((l) => l.id !== label.id)
      : [...taskLabels, label];

    setTogglingLabelId(label.id);
    setLabelError('');
    try {
      if (isAssigned) {
        await apiFetch(`/tasks/${task.id}/labels/${label.id}`, { method: 'DELETE' });
      } else {
        await apiFetch(`/tasks/${task.id}/labels/${label.id}`, { method: 'POST' });
      }
      setTaskLabels(newLabels);
      onUpdated({ id: task.id, labels: newLabels.map((l) => ({ label: l })) });
    } catch (e: unknown) {
      setLabelError((e as Error).message ?? 'Failed to update label');
    } finally {
      setTogglingLabelId(null);
    }
  }

  // ── Create & assign a new label ──
  async function handleCreateLabel() {
    const name = newLabelName.trim();
    if (!name || creatingLabel) return;
    setCreatingLabel(true);
    setLabelError('');
    try {
      const created = await apiFetch<Label>('/labels', {
        method: 'POST',
        body: JSON.stringify({ name, color: newLabelColor }),
      });
      // Also assign it to this task right away
      await apiFetch(`/tasks/${task.id}/labels/${created.id}`, { method: 'POST' });

      const newLabels = [...taskLabels, created];
      setTaskLabels(newLabels);
      onUpdated({ id: task.id, labels: newLabels.map((l) => ({ label: l })) });
      setNewLabelName('');
      setNewLabelColor(LABEL_COLORS[0]);
      setShowCreateLabel(false);
      onLabelCreated?.(); // tell parent to refresh allLabels
    } catch (e: unknown) {
      setLabelError((e as Error).message ?? 'Failed to create label');
    } finally {
      setCreatingLabel(false);
    }
  }

  // ── Add internal note ──
  async function addNote() {
    const body = newNoteBody.trim();
    setNoteError('');
    if (!body || addingNote) return;
    if (body.length < 2) {
      setNoteError('Note must be at least 2 characters');
      return;
    }
    setAddingNote(true);
    try {
      const note = await apiFetch<InternalNote>('/collaboration/notes', {
        method: 'POST',
        body: JSON.stringify({ body, resourceType: 'task', resourceId: task.id }),
      });
      setNotes((prev) => [note, ...prev]);
      setNewNoteBody('');
    } catch (e: unknown) {
      setNoteError((e as Error).message ?? 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  }

  // ── Register file metadata ──
  async function registerFile() {
    const name = newFileName.trim();
    if (!name) return;
    setAddingFile(true);
    setFileError('');
    try {
      await apiFetch('/files', {
        method: 'POST',
        body: JSON.stringify({ name, taskId: task.id }),
      });
      onUpdated({ id: task.id });
      setNewFileName('');
    } catch (e: unknown) {
      setFileError((e as Error).message ?? 'Failed to register file');
    } finally {
      setAddingFile(false);
    }
  }

  // ── Delete task ──
  async function handleDelete() {
    setDeleting(true);
    try {
      await apiFetch(`/tasks/${task.id}`, { method: 'DELETE' });
      onDeleted(task.id);
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  // ── Derived values ──
  const doneCount  = subtasks.filter((s) => s.status === 'DONE').length;
  const progress   = subtasks.length > 0 ? Math.round((doneCount / subtasks.length) * 100) : 0;
  const dueMeta    = formatDueDate(dueAt ? new Date(`${dueAt}T12:00:00`).toISOString() : null);
  const taskLabelIds = new Set(taskLabels.map((l) => l.id));
  const filteredAllLabels = allLabels.filter(
    (l) => l.name.toLowerCase().includes(labelSearch.toLowerCase()),
  );

  const ADD_MENU_OPTIONS: { key: SectionKey; label: string }[] = [
    { key: 'labels', label: 'Labels' },
    { key: 'notes',  label: 'Internal Notes' },
  ];
  const addMenuItems = ADD_MENU_OPTIONS.filter((o) => sections[o.key] === 'hidden');

  // ── Render ──
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-navy/30 backdrop-blur-[2px] z-40"
        onClick={() => { if (!dirty) onClose(); }}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 34 }}
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col bg-panel shadow-[-4px_0_40px_rgba(15,23,42,0.18)] w-full max-w-[640px] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
          <div className="flex items-center gap-2.5">
            <span
              className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ color: STATUS_META[status].color, backgroundColor: STATUS_META[status].bg }}
            >
              {STATUS_META[status].label}
            </span>
            {dirty && <span className="text-xs text-warning font-medium">Unsaved changes</span>}
          </div>
          <div className="flex items-center gap-2">
            {dirty && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3.5 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-accent transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            )}
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                title="Delete task"
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4h12M5 4V2.5A.5.5 0 015.5 2h5a.5.5 0 01.5.5V4M6 7v5M10 7v5M3 4l.8 8.2A1 1 0 004.8 13h6.4a1 1 0 001-.8L13 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-danger/10 rounded-lg px-2 py-1">
                <span className="text-xs text-danger font-medium">Delete?</span>
                <button onClick={handleDelete} disabled={deleting} className="text-xs text-danger font-semibold hover:underline disabled:opacity-50">
                  {deleting ? 'Deleting…' : 'Yes'}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs text-muted hover:text-ink">No</button>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-canvas transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-6">

            {/* Title */}
            <div>
              <textarea
                ref={titleRef}
                value={title}
                onChange={(e) => mark(setTitle)(e.target.value)}
                rows={2}
                className="w-full resize-none text-lg font-semibold text-ink bg-transparent outline-none border-0 leading-snug placeholder:text-muted/50 focus:ring-0"
                placeholder="Task title"
              />
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status">
                <select
                  value={status}
                  onChange={(e) => mark(setStatus)(e.target.value as TaskStatus)}
                  className="w-full text-sm rounded-lg border border-line bg-soft px-2.5 py-1.5 text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                >
                  {(Object.keys(STATUS_META) as TaskStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_META[s].label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Priority">
                <select
                  value={priority}
                  onChange={(e) => mark(setPriority)(e.target.value as TaskPriority | '')}
                  className="w-full text-sm rounded-lg border border-line bg-soft px-2.5 py-1.5 text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                >
                  <option value="">None</option>
                  {(Object.keys(PRIORITY_META) as TaskPriority[]).map((p) => (
                    <option key={p} value={p}>{PRIORITY_META[p].label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Assignee">
                <select
                  value={assigneeId}
                  onChange={(e) => mark(setAssigneeId)(e.target.value)}
                  className="w-full text-sm rounded-lg border border-line bg-soft px-2.5 py-1.5 text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.displayName ?? m.email}</option>
                  ))}
                </select>
              </Field>

              <Field label="Due Date">
                <input
                  type="date"
                  value={dueAt}
                  onChange={(e) => mark(setDueAt)(e.target.value)}
                  className="w-full text-sm rounded-lg border border-line bg-soft px-2.5 py-1.5 text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
                {dueMeta?.overdue && <p className="text-[11px] text-danger mt-1">Overdue</p>}
              </Field>

              <Field label="Project">
                <select
                  value={projectId}
                  onChange={(e) => mark(setProjectId)(e.target.value)}
                  className="w-full text-sm rounded-lg border border-line bg-soft px-2.5 py-1.5 text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                >
                  <option value="">No project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Description */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1.5">Description</p>
              <textarea
                value={description}
                onChange={(e) => mark(setDescription)(e.target.value)}
                rows={4}
                placeholder="Add a description…"
                className="w-full resize-none text-sm text-ink bg-soft rounded-xl border border-line px-3 py-2.5 outline-none placeholder:text-muted/60 focus:ring-2 focus:ring-accent/30 leading-relaxed"
              />
            </div>

            {saveError && (
              <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{saveError}</p>
            )}

            {/* ─── Labels (optional) ─── */}
            {sections.labels !== 'hidden' && (
              <section>
                <SectionHeader
                  label="Labels"
                  badge={taskLabels.length > 0 ? taskLabels.length : undefined}
                  collapsed={sections.labels === 'collapsed'}
                  onToggle={() =>
                    setSections((prev) => ({
                      ...prev,
                      labels: prev.labels === 'open' ? 'collapsed' : 'open',
                    }))
                  }
                />

                {sections.labels === 'open' && (
                  <div className="space-y-2.5">
                    {/* Current label chips */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {taskLabels.map((label) => (
                        <span
                          key={label.id}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                          style={{ backgroundColor: label.color }}
                        >
                          {label.name}
                          <button
                            onClick={() => toggleLabel(label)}
                            disabled={togglingLabelId === label.id}
                            className="w-3.5 h-3.5 flex items-center justify-center hover:opacity-70 disabled:opacity-50 transition-opacity leading-none"
                            title="Remove label"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <button
                        onClick={() => { setShowLabelPicker(!showLabelPicker); setShowCreateLabel(false); }}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border border-dashed border-line text-muted hover:text-accent hover:border-accent transition-colors"
                      >
                        + Add label
                      </button>
                    </div>

                    {/* Label picker (inline) */}
                    {showLabelPicker && (
                      <div className="border border-line rounded-xl bg-canvas p-3 space-y-2">
                        <input
                          value={labelSearch}
                          onChange={(e) => setLabelSearch(e.target.value)}
                          placeholder="Search labels…"
                          className="w-full text-sm border border-line bg-soft rounded-lg px-2.5 py-1.5 outline-none placeholder:text-muted/50 focus:ring-2 focus:ring-accent/30"
                        />

                        <div className="space-y-0.5 max-h-40 overflow-y-auto">
                          {filteredAllLabels.length === 0 ? (
                            <p className="text-xs text-muted py-2 text-center">
                              {labelSearch ? 'No labels match' : 'No workspace labels yet'}
                            </p>
                          ) : (
                            filteredAllLabels.map((label) => {
                              const isAssigned = taskLabelIds.has(label.id);
                              return (
                                <button
                                  key={label.id}
                                  onClick={() => toggleLabel(label)}
                                  disabled={togglingLabelId === label.id}
                                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-soft transition-colors text-left disabled:opacity-50"
                                >
                                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                                  <span className="text-sm text-ink flex-1">{label.name}</span>
                                  {isAssigned && (
                                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="shrink-0 text-accent">
                                      <path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  )}
                                  {togglingLabelId === label.id && (
                                    <span className="text-xs text-muted shrink-0">…</span>
                                  )}
                                </button>
                              );
                            })
                          )}
                        </div>

                        {labelError && (
                          <p className="text-xs text-danger px-1">{labelError}</p>
                        )}

                        <div className="border-t border-line pt-2">
                          {!showCreateLabel ? (
                            <button
                              onClick={() => setShowCreateLabel(true)}
                              className="w-full text-left text-xs text-muted hover:text-accent transition-colors px-2 py-1.5 rounded-lg hover:bg-soft"
                            >
                              + Create new label
                            </button>
                          ) : (
                            <div className="space-y-2">
                              <input
                                value={newLabelName}
                                onChange={(e) => setNewLabelName(e.target.value)}
                                placeholder="Label name…"
                                maxLength={50}
                                className="w-full text-sm border border-line bg-soft rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-accent/30"
                              />
                              <div className="flex gap-1.5 flex-wrap px-0.5">
                                {LABEL_COLORS.map((color) => (
                                  <button
                                    key={color}
                                    onClick={() => setNewLabelColor(color)}
                                    className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${newLabelColor === color ? 'ring-2 ring-offset-1 ring-slate-400 scale-110' : ''}`}
                                    style={{ backgroundColor: color }}
                                    title={color}
                                  />
                                ))}
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => { setShowCreateLabel(false); setNewLabelName(''); }}
                                  className="text-xs text-muted hover:text-ink transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleCreateLabel}
                                  disabled={!newLabelName.trim() || creatingLabel}
                                  className="text-xs font-semibold text-accent hover:underline disabled:opacity-50"
                                >
                                  {creatingLabel ? 'Creating…' : 'Create & assign'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* ─── Checklist ─── */}
            <section>
              <SectionHeader
                label={`Checklist${subtasks.length > 0 ? ` ${doneCount}/${subtasks.length}` : ''}`}
                collapsed={checklistCollapsed}
                onToggle={() => setChecklistCollapsed((v) => !v)}
              />

              {!checklistCollapsed && (
                <>
                  {subtasks.length > 0 && (
                    <div className="mb-3">
                      <div className="w-full bg-line rounded-full h-1.5">
                        <motion.div
                          className="bg-brand h-1.5 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <p className="text-[11px] text-muted mt-1">{progress}% complete</p>
                    </div>
                  )}

                  {subLoading ? (
                    <p className="text-xs text-muted">Loading…</p>
                  ) : (
                    <div className="space-y-0.5 mb-3">
                      {subtasks.map((sub) => (
                        <SubtaskRow
                          key={sub.id}
                          sub={sub}
                          onToggle={toggleSub}
                          onRequestDelete={(id) => { setConfirmDeleteSub(id); }}
                          isConfirmingDelete={confirmDeleteSub === sub.id}
                          onConfirmDelete={deleteSub}
                          onCancelDelete={() => setConfirmDeleteSub(null)}
                          isDeleting={deletingSub === sub.id}
                        />
                      ))}
                    </div>
                  )}

                  {/* Add checklist item */}
                  <div className="space-y-1">
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={newSubTitle}
                        onChange={(e) => { setNewSubTitle(e.target.value); setSubTitleError(''); }}
                        onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
                        placeholder="Add checklist item…"
                        className="flex-1 text-sm border border-line bg-soft rounded-lg px-2.5 py-1.5 outline-none placeholder:text-muted/50 focus:ring-2 focus:ring-accent/30"
                      />
                      <button
                        onClick={addSubtask}
                        disabled={addingSub}
                        className="px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold disabled:opacity-40 hover:bg-accent transition-colors"
                      >
                        {addingSub ? '…' : 'Add'}
                      </button>
                    </div>
                    {subTitleError && (
                      <p className="text-[11px] text-danger">{subTitleError}</p>
                    )}
                  </div>
                </>
              )}
            </section>

            {/* ─── Attachments ─── */}
            <section>
              <SectionHeader
                label="Attachments"
                badge={attachments.length > 0 ? attachments.length : undefined}
                collapsed={attachmentsCollapsed}
                onToggle={() => setAttachmentsCollapsed((v) => !v)}
              />

              {!attachmentsCollapsed && (
                <>
                  {attachments.length > 0 ? (
                    <div className="space-y-1.5 mb-3">
                      {attachments.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center gap-3 rounded-xl border border-line bg-soft px-3 py-2"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-muted">
                            <path d="M13.5 7.5l-5.5 5.5a3.5 3.5 0 01-4.95-4.95l5.5-5.5a2 2 0 012.83 2.83L5.88 11.37a.5.5 0 01-.71-.71L10 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-ink truncate">{f.name}</p>
                            {f.createdBy && (
                              <p className="text-[11px] text-muted">
                                {f.createdBy.displayName ?? 'Unknown'} · {new Date(f.createdAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted mb-3">No attachments yet.</p>
                  )}

                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && registerFile()}
                      placeholder="File name (e.g. brief.pdf)…"
                      className="flex-1 text-sm border border-line bg-soft rounded-lg px-2.5 py-1.5 outline-none placeholder:text-muted/50 focus:ring-2 focus:ring-accent/30"
                    />
                    <button
                      onClick={registerFile}
                      disabled={!newFileName.trim() || addingFile}
                      className="px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold disabled:opacity-40 hover:bg-accent transition-colors"
                    >
                      {addingFile ? '…' : 'Register'}
                    </button>
                  </div>
                  {fileError && <p className="text-[11px] text-danger mt-1">{fileError}</p>}
                  <p className="text-[11px] text-muted mt-1.5">
                    Register a file name now. File storage integration is a future improvement.
                  </p>
                </>
              )}
            </section>

            {/* ─── Internal Notes (optional) ─── */}
            {sections.notes !== 'hidden' && (
              <section>
                <SectionHeader
                  label="Internal Notes"
                  badge={notes.length > 0 ? notes.length : undefined}
                  collapsed={sections.notes === 'collapsed'}
                  onToggle={() =>
                    setSections((prev) => ({
                      ...prev,
                      notes: prev.notes === 'open' ? 'collapsed' : 'open',
                    }))
                  }
                />

                {sections.notes === 'open' && (
                  <div className="space-y-4">
                    {/* Add note */}
                    <div className="space-y-1.5">
                      <textarea
                        value={newNoteBody}
                        onChange={(e) => { setNewNoteBody(e.target.value); setNoteError(''); }}
                        rows={3}
                        placeholder="Write an internal note…"
                        className="w-full resize-none text-sm text-ink bg-soft rounded-xl border border-line px-3 py-2.5 outline-none placeholder:text-muted/60 focus:ring-2 focus:ring-accent/30 leading-relaxed"
                      />
                      {noteError && <p className="text-[11px] text-danger">{noteError}</p>}
                      <button
                        onClick={addNote}
                        disabled={!newNoteBody.trim() || addingNote}
                        className="px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold disabled:opacity-40 hover:bg-accent transition-colors"
                      >
                        {addingNote ? 'Adding…' : 'Add Note'}
                      </button>
                    </div>

                    {/* Notes list */}
                    {notesLoading ? (
                      <p className="text-xs text-muted">Loading notes…</p>
                    ) : notes.length === 0 ? (
                      <p className="text-xs text-muted">No notes yet. Add one above.</p>
                    ) : (
                      <div className="space-y-4">
                        {notes.map((note) => (
                          <NoteItem key={note.id} note={note} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* ─── Add block menu ─── */}
            {addMenuItems.length > 0 && (
              <div>
                <button
                  onClick={() => setShowAddMenu((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors px-2 py-1 rounded-lg hover:bg-soft border border-dashed border-line"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                  </svg>
                  Add block
                </button>
                <AnimatePresence>
                  {showAddMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.12 }}
                      className="mt-1.5 rounded-xl border border-line bg-panel shadow-sm py-1 w-44"
                    >
                      {addMenuItems.map((item) => (
                        <button
                          key={item.key}
                          onClick={() => {
                            setSections((prev) => ({ ...prev, [item.key]: 'open' }));
                            setShowAddMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-soft transition-colors"
                        >
                          {item.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ─── Activity ─── */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">Activity</p>
              <div className="space-y-3 text-[11px] text-muted border-l-2 border-line ml-2 pl-4">
                <div className="relative before:absolute before:-left-[21px] before:top-1 before:w-2 before:h-2 before:rounded-full before:bg-line">
                  Task created
                  <span className="ml-2 text-muted/70">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {task.updatedAt !== task.createdAt && (
                  <div className="relative before:absolute before:-left-[21px] before:top-1 before:w-2 before:h-2 before:rounded-full before:bg-line">
                    Last updated
                    <span className="ml-2 text-muted/70">
                      {new Date(task.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* Bottom spacer */}
            <div className="h-4" />
          </div>
        </div>

        {/* Sticky save footer */}
        <AnimatePresence>
          {dirty && (
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="shrink-0 border-t border-line bg-panel px-6 py-3 flex items-center justify-between"
            >
              <span className="text-xs text-muted">You have unsaved changes</span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setTitle(task.title);
                    setDescription(task.description ?? '');
                    setStatus(task.status);
                    setPriority(task.priority ?? '');
                    setAssigneeId(task.assignedToUserId ?? '');
                    setProjectId(task.projectId ?? '');
                    setDueAt(task.dueAt ? task.dueAt.slice(0, 10) : '');
                    setDirty(false);
                  }}
                  className="px-3 py-1.5 rounded-lg text-muted text-xs hover:text-ink transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !title.trim()}
                  className="px-4 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-accent transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1">{label}</p>
      {children}
    </div>
  );
}
