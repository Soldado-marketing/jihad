'use client';

/**
 * A project's own Trello-style board (owner approval 2026-10-29): custom
 * lists that are created, renamed, reordered, archived and restored, and
 * cards that move between them and keep their position. Everything is saved
 * through the API; the board reads nothing it may not and writes nothing on
 * open (lists are set up only by the explicit "Set up lists" action).
 */

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/fetch';
import { getStoredUser } from '@/lib/auth';
import { PageHeader } from '@/components/ui/page-header';
import { TaskCard } from './task-card';
import { TaskModal } from './task-modal';
import { dropIndex, moveCard, reorderItems } from './board-order';
import { UNLISTED, activeLists, canManageLists, placeCards, type BoardList } from './board-lists';
import { STATUS_META, type FileAttachment, type Label, type Member, type Project, type Task, type TaskStatus } from './task-types';

type Props = { projectId: string };

const MAPPABLE: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE'];

export function ProjectBoard({ projectId }: Props) {
  const [project, setProject] = useState<Project | null>(null);
  const [lists, setLists] = useState<BoardList[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newList, setNewList] = useState('');
  const [newListStatus, setNewListStatus] = useState<TaskStatus | ''>('');
  const [showArchived, setShowArchived] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [cardTitle, setCardTitle] = useState('');
  const [selected, setSelected] = useState<Task | null>(null);
  const dragId = useRef<string | null>(null);
  const [role, setRole] = useState<string | undefined>();

  const loadLists = useCallback(async () => {
    setLists(await apiFetch<BoardList[]>(`/projects/${projectId}/lists?includeArchived=true`));
  }, [projectId]);

  const loadTasks = useCallback(async () => {
    const t = await apiFetch<Task[]>(`/tasks?projectId=${encodeURIComponent(projectId)}`);
    setTasks(Array.isArray(t) ? t : []);
  }, [projectId]);

  useEffect(() => {
    setRole(getStoredUser()?.role);
    (async () => {
      try {
        const [p] = await Promise.all([
          apiFetch<Project>(`/projects/${projectId}`),
          loadLists(),
          loadTasks(),
          apiFetch<Member[]>('/users/members').then(setMembers).catch(() => undefined),
          apiFetch<Project[]>('/projects').then(setProjects).catch(() => undefined),
          apiFetch<FileAttachment[]>('/files').then(setFiles).catch(() => undefined),
          apiFetch<Label[]>('/labels').then(setLabels).catch(() => undefined),
        ]);
        setProject(p);
      } catch (e) {
        setError((e as Error).message || 'Board could not be loaded.');
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId, loadLists, loadTasks]);

  const manage = canManageLists(role);
  const active = activeLists(lists);
  const archived = lists.filter((l) => l.archivedAt);
  const groups = placeCards(tasks, lists);
  const unlisted = groups.get(UNLISTED) ?? [];

  /** Runs a change, then reloads what it touched; a failure shows a message and the saved state. */
  async function run(action: () => Promise<unknown>, reload: 'lists' | 'tasks' | 'both' = 'lists') {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError((e as Error).message || 'The change was not saved.');
    } finally {
      await Promise.all([reload !== 'tasks' ? loadLists() : null, reload !== 'lists' ? loadTasks() : null]);
      setBusy(false);
    }
  }

  const initialize = () => run(() => apiFetch(`/projects/${projectId}/lists/initialize`, { method: 'POST' }));
  const createList = () => {
    const name = newList.trim();
    if (!name) return;
    void run(async () => {
      await apiFetch(`/projects/${projectId}/lists`, { method: 'POST', body: JSON.stringify({ name, ...(newListStatus ? { status: newListStatus } : {}) }) });
      setNewList('');
      setNewListStatus('');
    });
  };
  const patchList = (id: string, body: Record<string, unknown>) =>
    run(() => apiFetch(`/lists/${id}`, { method: 'PATCH', body: JSON.stringify(body) }), 'both');
  const moveList = (id: string, by: -1 | 1) => {
    const ids = active.map((l) => l.id);
    const at = ids.indexOf(id) + by;
    if (at < 0 || at >= ids.length) return;
    void run(() => apiFetch(`/projects/${projectId}/lists/reorder`, { method: 'PATCH', body: JSON.stringify({ ids: moveCard(ids, id, at) }) }));
  };

  async function dropOn(e: React.DragEvent, list: BoardList) {
    e.preventDefault();
    const id = dragId.current;
    dragId.current = null;
    if (!id) return;
    const cards = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[data-task-card]')].filter((el) => el.dataset.taskCard !== id);
    const index = dropIndex(cards.map((el) => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; }), e.clientY);
    const ordered = moveCard((groups.get(list.id) ?? []).map((t) => t.id), id, index);
    // Only the moved card changes list; the others only get their new position.
    const items = reorderItems(ordered).map((item) => (item.id === id ? { ...item, listId: list.id } : item));
    const order = new Map(items.map((i) => [i.id, i.sortOrder]));
    setTasks((prev) => prev.map((t) => (order.has(t.id) ? { ...t, sortOrder: order.get(t.id), ...(t.id === id ? { listId: list.id, status: list.status ?? t.status } : {}) } : t)));
    await run(() => apiFetch('/tasks/reorder', { method: 'PATCH', body: JSON.stringify({ items }) }), 'tasks');
  }

  async function addCard(list: BoardList) {
    const title = cardTitle.trim();
    if (title.length < 2) return;
    await run(async () => {
      const created = await apiFetch<Task>('/tasks', { method: 'POST', body: JSON.stringify({ title, projectId, ...(list.status ? { status: list.status } : {}) }) });
      const last = (groups.get(list.id) ?? []).at(-1)?.sortOrder ?? 0;
      await apiFetch('/tasks/reorder', { method: 'PATCH', body: JSON.stringify({ items: [{ id: created.id, sortOrder: last + 1000, listId: list.id }] }) });
      setCardTitle('');
      setAdding(null);
    }, 'tasks');
  }

  const attachments = (taskId: string) => files.filter((f) => f.taskId === taskId).length;
  const card = (task: Task) => (
    <TaskCard key={task.id} task={task} attachmentCount={attachments(task.id)} onOpen={setSelected} onDragStart={(e, id) => { dragId.current = id; e.dataTransfer.effectAllowed = 'move'; }} />
  );

  if (loading) return <p className="py-12 text-center text-sm text-muted">Loading board…</p>;

  return (
    <div className="flex min-h-0 flex-col gap-5">
      <PageHeader
        eyebrow="Project board"
        title={project?.name ?? 'Board'}
        description={`${tasks.length} card${tasks.length === 1 ? '' : 's'} · ${active.length} list${active.length === 1 ? '' : 's'}`}
        actions={<Link href={`/projects/${projectId}`} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-soft">Project details</Link>}
      />
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>}

      {lists.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-line bg-white p-6 text-center">
          <h2 className="text-base font-semibold text-ink">This board has no lists yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Setting up creates To Do, In Progress, In Review, Blocked and Done. Existing cards appear in the list that matches their status, and you can rename, add or archive lists afterwards.
          </p>
          {manage ? (
            <button type="button" onClick={() => void initialize()} disabled={busy} className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Set up lists</button>
          ) : (
            <p className="mt-4 text-sm text-muted">An owner or manager sets up the lists. Until then, use the <Link className="font-semibold text-accent" href={`/tasks?project=${encodeURIComponent(projectId)}`}>status board</Link>.</p>
          )}
        </section>
      ) : (
        <div role="region" aria-label="Board lists" tabIndex={0} aria-busy={busy} className="grid grid-flow-col auto-cols-[85vw] gap-4 overflow-x-auto snap-x snap-mandatory pb-6 sm:auto-cols-[17rem] sm:snap-proximity">
          {unlisted.length > 0 && (
            <section aria-label="Not in a list" className="flex min-w-0 snap-start flex-col rounded-2xl border border-dashed border-line p-2.5">
              <h2 className="mb-2 px-1 text-sm font-semibold text-muted">Not in a list <span className="font-normal">{unlisted.length}</span></h2>
              <div className="flex flex-col gap-2.5"><AnimatePresence>{unlisted.map(card)}</AnimatePresence></div>
            </section>
          )}
          {active.map((list, i) => {
            const listCards = groups.get(list.id) ?? [];
            return (
              <section key={list.id} aria-label={list.name} data-list={list.id} className="flex min-w-0 snap-start flex-col rounded-2xl bg-soft/60 p-2.5" onDragOver={(e) => e.preventDefault()} onDrop={(e) => void dropOn(e, list)}>
                <header className="mb-2 flex items-center gap-1 px-1">
                  {renaming === list.id ? (
                    <input
                      autoFocus
                      aria-label="List name"
                      defaultValue={list.name}
                      maxLength={60}
                      onBlur={(e) => { const name = e.target.value.trim(); setRenaming(null); if (name && name !== list.name) void patchList(list.id, { name }); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setRenaming(null); }}
                      className="min-w-0 flex-1 rounded-lg border border-line bg-white px-2 py-1 text-sm font-semibold"
                    />
                  ) : (
                    <h2 className="min-w-0 flex-1 truncate px-1 py-1 text-sm font-semibold text-ink">
                      {manage ? (
                        <button type="button" onClick={() => setRenaming(list.id)} title="Rename list" className="max-w-full truncate rounded text-start hover:underline">{list.name}</button>
                      ) : list.name}{' '}
                      <span className="font-normal text-muted">{listCards.length}</span>
                    </h2>
                  )}
                  {manage && (
                    <>
                      <button type="button" aria-label={`Move ${list.name} earlier`} disabled={busy || i === 0} onClick={() => moveList(list.id, -1)} className="h-8 w-8 rounded-lg text-muted hover:bg-white disabled:opacity-30">‹</button>
                      <button type="button" aria-label={`Move ${list.name} later`} disabled={busy || i === active.length - 1} onClick={() => moveList(list.id, 1)} className="h-8 w-8 rounded-lg text-muted hover:bg-white disabled:opacity-30">›</button>
                      <button type="button" aria-label={`Archive ${list.name}`} disabled={busy} onClick={() => void patchList(list.id, { archived: true })} className="h-8 rounded-lg px-1.5 text-xs text-muted hover:bg-white">Archive</button>
                    </>
                  )}
                </header>
                {list.status && <p className="mb-2 px-1 text-[0.7rem] text-muted">Cards here: {STATUS_META[list.status].label}</p>}
                <div className="flex min-h-[6rem] flex-col gap-2.5">
                  <AnimatePresence>{listCards.map(card)}</AnimatePresence>
                  {listCards.length === 0 && <p className="py-6 text-center text-xs text-muted">Drop cards here</p>}
                </div>
                {adding === list.id ? (
                  <div className="mt-2 rounded-xl border border-line bg-white p-2">
                    <input autoFocus aria-label={`New card in ${list.name}`} value={cardTitle} maxLength={180} onChange={(e) => setCardTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void addCard(list); if (e.key === 'Escape') setAdding(null); }} placeholder="Card title" className="w-full rounded-lg px-2 py-1.5 text-sm outline-none" />
                    <div className="mt-1 flex gap-2">
                      <button type="button" disabled={busy || cardTitle.trim().length < 2} onClick={() => void addCard(list)} className="rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-white disabled:opacity-40">Add card</button>
                      <button type="button" onClick={() => setAdding(null)} className="px-2 text-xs text-muted">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => { setAdding(list.id); setCardTitle(''); }} className="mt-2 rounded-xl px-2 py-2 text-start text-xs text-muted hover:bg-white hover:text-accent">+ Add a card</button>
                )}
              </section>
            );
          })}
          {manage && (
            <div className="snap-start self-start rounded-2xl border border-dashed border-line p-3">
              <label htmlFor="new-list" className="text-sm font-semibold text-ink">Add a list</label>
              <input id="new-list" value={newList} maxLength={60} onChange={(e) => setNewList(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createList()} placeholder="e.g. Editing" className="mt-2 w-full rounded-lg border border-line bg-white px-2 py-1.5 text-sm" />
              <label htmlFor="new-list-status" className="mt-2 block text-xs text-muted">Cards moved here become</label>
              <select id="new-list-status" value={newListStatus} onChange={(e) => setNewListStatus(e.target.value as TaskStatus | '')} className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-1.5 text-sm">
                <option value="">Keep their status</option>
                {MAPPABLE.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
              </select>
              <button type="button" onClick={createList} disabled={busy || !newList.trim()} className="mt-2 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">Add list</button>
              {archived.length > 0 && (
                <div className="mt-4">
                  <button type="button" aria-expanded={showArchived} onClick={() => setShowArchived((v) => !v)} className="text-xs font-semibold text-muted hover:text-ink">
                    Archived lists ({archived.length})
                  </button>
                  {showArchived && (
                    <ul className="mt-2 space-y-1">
                      {archived.map((l) => (
                        <li key={l.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate">{l.name}</span>
                          <button type="button" disabled={busy} onClick={() => void patchList(l.id, { archived: false })} className="text-xs font-semibold text-accent">Restore</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <TaskModal
            task={selected}
            members={members}
            projects={projects}
            allFiles={files}
            allLabels={labels}
            onClose={() => setSelected(null)}
            onUpdated={() => void loadTasks()}
            onDeleted={() => { setSelected(null); void loadTasks(); }}
            onLabelCreated={() => void apiFetch<Label[]>('/labels').then(setLabels)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
