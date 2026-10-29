'use client';

/**
 * Prototype of the Trello-style project board with custom lists (owner
 * request 2026-10-29). Fictional data in browser state only: nothing is
 * saved. It shows the target behaviour of the proposed TaskList schema
 * (docs/proposals/MAOS_PROJECT_BOARD_LISTS_PROPOSAL.md) and reuses the real
 * TaskCard, board ordering helpers, PageHeader and modal primitives.
 */

import { useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-header';
import { ModalContent, ModalOverlay } from '@/components/motion/modal-overlay';
import { TaskCard } from './task-card';
import { dropIndex, moveCard } from './board-order';
import type { Task } from './task-types';

type List = { id: string; name: string; archived: boolean };
type Person = { id: string; name: string; color: string };
type CardExtra = {
  listId: string;
  assignees: string[];
  checklist: { title: string; done: boolean }[];
  attachments: string[];
  comments: { author: string; body: string; at: string }[];
  activity: string[];
};

const PEOPLE: Person[] = [
  { id: 'p1', name: 'Lena Novak', color: '#0f766e' },
  { id: 'p2', name: 'Omar Haddad', color: '#b45309' },
  { id: 'p3', name: 'Sofia Brandt', color: '#7c3aed' },
];
const LABELS = {
  design: { id: 'l1', name: 'Design', color: '#7c3aed' },
  copy: { id: 'l2', name: 'Copy', color: '#0369a1' },
  client: { id: 'l3', name: 'Client input', color: '#b42318' },
};
const PROJECT = { id: 'demo', name: 'Website relaunch (sample)' };

function task(id: string, title: string, days: number | null, labels: (keyof typeof LABELS)[], priority: Task['priority'] = 'MEDIUM'): Task {
  const due = days === null ? null : new Date(Date.now() + days * 86400000).toISOString();
  return {
    id, title, description: null, status: 'TODO', priority, dueAt: due, projectId: PROJECT.id,
    assignedToUserId: null, createdAt: '2026-10-20T09:00:00Z', updatedAt: '2026-10-20T09:00:00Z',
    project: PROJECT, assignedTo: null, _count: { subtasks: 0 }, labels: labels.map((k) => ({ label: LABELS[k] })),
  };
}

const INITIAL_LISTS: List[] = [
  { id: 'L1', name: 'Ideas', archived: false },
  { id: 'L2', name: 'This week', archived: false },
  { id: 'L3', name: 'Waiting for client', archived: false },
  { id: 'L4', name: 'Ready to publish', archived: false },
];

const INITIAL_CARDS: { task: Task; extra: CardExtra }[] = [
  { task: task('c1', 'Homepage hero copy', 3, ['copy']), extra: { listId: 'L2', assignees: ['p1', 'p2'], checklist: [{ title: 'Draft headline', done: true }, { title: 'Two variants', done: false }, { title: 'Owner review', done: false }], attachments: ['hero-brief.pdf'], comments: [{ author: 'Omar Haddad', body: 'Keep it under 8 words.', at: '2 h ago' }], activity: ['Card created in Ideas', 'Moved from Ideas to This week'] } },
  { task: task('c2', 'Logo files from client', -1, ['client'], 'HIGH'), extra: { listId: 'L3', assignees: ['p3'], checklist: [], attachments: [], comments: [], activity: ['Card created in Waiting for client'] } },
  { task: task('c3', 'Service page layout', 6, ['design']), extra: { listId: 'L2', assignees: ['p3'], checklist: [{ title: 'Wireframe', done: true }, { title: 'Mobile check', done: true }], attachments: ['layout-v2.fig', 'notes.txt'], comments: [], activity: ['Card created in This week'] } },
  { task: task('c4', 'FAQ section ideas', null, ['copy'], 'LOW'), extra: { listId: 'L1', assignees: [], checklist: [], attachments: [], comments: [], activity: ['Card created in Ideas'] } },
  { task: task('c5', 'Team photos', 10, ['design', 'client']), extra: { listId: 'L1', assignees: ['p1'], checklist: [{ title: 'Book photographer', done: false }], attachments: [], comments: [], activity: ['Card created in Ideas'] } },
  { task: task('c6', 'Imprint and privacy page', 2, ['copy'], 'URGENT'), extra: { listId: 'L4', assignees: ['p2'], checklist: [{ title: 'Legal check', done: true }], attachments: ['imprint.docx'], comments: [{ author: 'Lena Novak', body: 'Approved by legal.', at: 'yesterday' }], activity: ['Card created in This week', 'Moved from This week to Ready to publish'] } },
];

const initials = (name: string) => name.split(' ').map((p) => p[0]).join('').slice(0, 2);

export function BoardPrototype() {
  const [lists, setLists] = useState<List[]>(INITIAL_LISTS);
  const [cards, setCards] = useState(INITIAL_CARDS);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newList, setNewList] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const dragId = useRef<string | null>(null);

  const active = lists.filter((l) => !l.archived);
  const archived = lists.filter((l) => l.archived);
  const listName = (id: string) => lists.find((l) => l.id === id)?.name ?? '';
  const open = cards.find((c) => c.task.id === openId) ?? null;

  function patchCard(id: string, patch: (extra: CardExtra) => CardExtra) {
    setCards((prev) => prev.map((c) => (c.task.id === id ? { ...c, extra: patch(c.extra) } : c)));
  }

  function moveList(id: string, by: -1 | 1) {
    setLists((prev) => {
      const visible = prev.filter((l) => !l.archived);
      const i = visible.findIndex((l) => l.id === id);
      const j = i + by;
      if (j < 0 || j >= visible.length) return prev;
      const order = moveCard(visible.map((l) => l.id), id, j);
      return [...order.map((x) => prev.find((l) => l.id === x)!), ...prev.filter((l) => l.archived)];
    });
  }

  function addList() {
    const name = newList.trim();
    if (!name) return;
    setLists((prev) => [...prev, { id: `L${Date.now()}`, name, archived: false }]);
    setNewList('');
  }

  function drop(e: React.DragEvent, listId: string) {
    e.preventDefault();
    const id = dragId.current;
    dragId.current = null;
    if (!id) return;
    const els = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[data-task-card]')].filter((el) => el.dataset.taskCard !== id);
    const index = dropIndex(els.map((el) => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; }), e.clientY);
    setCards((prev) => {
      const card = prev.find((c) => c.task.id === id)!;
      const from = card.extra.listId;
      const moved = { ...card, extra: { ...card.extra, listId, activity: from === listId ? card.extra.activity : [...card.extra.activity, `Moved from ${listName(from)} to ${listName(listId)}`] } };
      const order = moveCard(prev.filter((c) => c.extra.listId === listId).map((c) => c.task.id), id, index);
      const others = prev.filter((c) => c.extra.listId !== listId && c.task.id !== id);
      return [...others, ...order.map((x) => (x === id ? moved : prev.find((c) => c.task.id === x)!))];
    });
  }

  return (
    <div className="flex min-h-0 flex-col gap-5">
      <PageHeader
        eyebrow="Prototype · fictional data"
        title="Website relaunch board"
        description="Custom lists per project, as proposed. Nothing on this page is saved."
      />
      <p role="note" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
        Preview only: custom lists need the database change in the board proposal before they can be saved.
      </p>

      <div role="region" aria-label="Board lists" tabIndex={0} className="grid grid-flow-col auto-cols-[85vw] gap-4 overflow-x-auto snap-x snap-mandatory pb-6 sm:auto-cols-[17rem] sm:snap-proximity">
        {active.map((list, i) => {
          const listCards = cards.filter((c) => c.extra.listId === list.id);
          return (
            <section key={list.id} aria-label={list.name} className="flex min-w-0 snap-start flex-col rounded-2xl bg-soft/60 p-2.5" onDragOver={(e) => e.preventDefault()} onDrop={(e) => drop(e, list.id)}>
              <header className="mb-2 flex items-center gap-1 px-1">
                {renaming === list.id ? (
                  <input
                    autoFocus
                    aria-label="List name"
                    defaultValue={list.name}
                    maxLength={60}
                    onBlur={(e) => { const name = e.target.value.trim(); if (name) setLists((p) => p.map((l) => (l.id === list.id ? { ...l, name } : l))); setRenaming(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setRenaming(null); }}
                    className="min-w-0 flex-1 rounded-lg border border-line bg-white px-2 py-1 text-sm font-semibold"
                  />
                ) : (
                  <button type="button" onClick={() => setRenaming(list.id)} title="Rename list" className="min-w-0 flex-1 truncate rounded-lg px-1 py-1 text-start text-sm font-semibold text-ink hover:bg-white">
                    {list.name} <span className="font-normal text-muted">{listCards.length}</span>
                  </button>
                )}
                <button type="button" aria-label={`Move ${list.name} earlier`} disabled={i === 0} onClick={() => moveList(list.id, -1)} className="h-8 w-8 rounded-lg text-muted hover:bg-white disabled:opacity-30">‹</button>
                <button type="button" aria-label={`Move ${list.name} later`} disabled={i === active.length - 1} onClick={() => moveList(list.id, 1)} className="h-8 w-8 rounded-lg text-muted hover:bg-white disabled:opacity-30">›</button>
                <button type="button" aria-label={`Archive ${list.name}`} onClick={() => setLists((p) => p.map((l) => (l.id === list.id ? { ...l, archived: true } : l)))} className="h-8 rounded-lg px-1.5 text-xs text-muted hover:bg-white">Archive</button>
              </header>
              <div className="flex min-h-[6rem] flex-col gap-2.5">
                <AnimatePresence>
                  {listCards.map((c) => (
                    <TaskCard
                      key={c.task.id}
                      task={{ ...c.task, _count: { subtasks: c.extra.checklist.length }, assignedTo: c.extra.assignees[0] ? { id: c.extra.assignees[0], displayName: PEOPLE.find((p) => p.id === c.extra.assignees[0])!.name, email: '' } : null }}
                      attachmentCount={c.extra.attachments.length}
                      onOpen={(t) => setOpenId(t.id)}
                      onDragStart={(e, id) => { dragId.current = id; e.dataTransfer.effectAllowed = 'move'; }}
                    />
                  ))}
                </AnimatePresence>
                {listCards.length === 0 && <p className="py-6 text-center text-xs text-muted">Drop cards here</p>}
              </div>
            </section>
          );
        })}
        <div className="snap-start rounded-2xl border border-dashed border-line p-3">
          <label htmlFor="new-list" className="text-sm font-semibold text-ink">Add a list</label>
          <input id="new-list" value={newList} maxLength={60} onChange={(e) => setNewList(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addList()} placeholder="List name" className="mt-2 w-full rounded-lg border border-line bg-white px-2 py-1.5 text-sm" />
          <button type="button" onClick={addList} disabled={!newList.trim()} className="mt-2 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">Add list</button>
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
                      <button type="button" onClick={() => setLists((p) => p.map((x) => (x.id === l.id ? { ...x, archived: false } : x)))} className="text-xs font-semibold text-accent">Restore</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <ModalOverlay onClose={() => setOpenId(null)}>
            <ModalContent className="max-h-[85vh] w-[min(40rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl bg-white p-5 shadow-card">
              <div role="dialog" aria-modal="true" aria-labelledby="proto-card-title" onKeyDown={(e) => e.key === 'Escape' && setOpenId(null)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted">in list <strong className="text-ink">{listName(open.extra.listId)}</strong></p>
                    <h2 id="proto-card-title" className="mt-1 text-lg font-semibold text-ink">{open.task.title}</h2>
                  </div>
                  <button type="button" autoFocus onClick={() => setOpenId(null)} aria-label="Close card" className="h-9 w-9 shrink-0 rounded-lg text-muted hover:bg-soft">✕</button>
                </div>

                <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Assignees</dt>
                    <dd className="mt-1 flex -space-x-1">
                      {open.extra.assignees.length === 0 && <span className="text-sm text-muted">None</span>}
                      {open.extra.assignees.map((id) => { const p = PEOPLE.find((x) => x.id === id)!; return <span key={id} title={p.name} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[0.6rem] font-bold text-white" style={{ backgroundColor: p.color }}>{initials(p.name)}</span>; })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Labels</dt>
                    <dd className="mt-1 flex flex-wrap gap-1">{open.task.labels?.map(({ label }) => <span key={label.id} className="rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: label.color }}>{label.name}</span>)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Due</dt>
                    <dd className="mt-1 text-sm text-ink">{open.task.dueAt ? new Date(open.task.dueAt).toLocaleDateString() : 'No date'}</dd>
                  </div>
                </dl>

                <section className="mt-5" aria-labelledby="proto-checklist">
                  <h3 id="proto-checklist" className="text-sm font-semibold text-ink">Checklist {open.extra.checklist.length > 0 && <span className="font-normal text-muted">{open.extra.checklist.filter((x) => x.done).length}/{open.extra.checklist.length}</span>}</h3>
                  {open.extra.checklist.length > 0 && (
                    <div className="mt-2 h-1.5 rounded-full bg-soft"><div className="h-1.5 rounded-full bg-accent" style={{ width: `${(100 * open.extra.checklist.filter((x) => x.done).length) / open.extra.checklist.length}%` }} /></div>
                  )}
                  <ul className="mt-2 space-y-1">
                    {open.extra.checklist.map((item, i) => (
                      <li key={item.title}>
                        <label className="flex min-h-9 items-center gap-2 text-sm">
                          <input type="checkbox" checked={item.done} onChange={() => patchCard(open.task.id, (x) => ({ ...x, checklist: x.checklist.map((c, j) => (j === i ? { ...c, done: !c.done } : c)) }))} />
                          <span className={item.done ? 'text-muted line-through' : 'text-ink'}>{item.title}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="mt-5" aria-labelledby="proto-files">
                  <h3 id="proto-files" className="text-sm font-semibold text-ink">Attachments</h3>
                  {open.extra.attachments.length === 0 ? <p className="mt-1 text-sm text-muted">No files.</p> : (
                    <ul className="mt-1 space-y-1 text-sm text-ink">{open.extra.attachments.map((f) => <li key={f} className="rounded-lg bg-soft px-2 py-1">{f}</li>)}</ul>
                  )}
                </section>

                <section className="mt-5" aria-labelledby="proto-comments">
                  <h3 id="proto-comments" className="text-sm font-semibold text-ink">Comments</h3>
                  <ul className="mt-1 space-y-2">
                    {open.extra.comments.map((c, i) => <li key={i} className="rounded-lg bg-soft px-3 py-2 text-sm"><strong>{c.author}</strong> <span className="text-xs text-muted">{c.at}</span><p>{c.body}</p></li>)}
                  </ul>
                  <div className="mt-2 flex gap-2">
                    <input aria-label="Write a comment" value={comment} maxLength={500} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment…" className="min-w-0 flex-1 rounded-lg border border-line px-2 py-1.5 text-sm" />
                    <button type="button" disabled={!comment.trim()} onClick={() => { patchCard(open.task.id, (x) => ({ ...x, comments: [...x.comments, { author: 'You', body: comment.trim(), at: 'just now' }], activity: [...x.activity, 'Comment added'] })); setComment(''); }} className="rounded-lg bg-brand px-3 text-xs font-semibold text-white disabled:opacity-40">Send</button>
                  </div>
                </section>

                <section className="mt-5" aria-labelledby="proto-activity">
                  <h3 id="proto-activity" className="text-sm font-semibold text-ink">Activity</h3>
                  <ol className="mt-1 space-y-1 border-s border-line ps-3 text-sm text-muted">{[...open.extra.activity].reverse().map((a, i) => <li key={i}>{a}</li>)}</ol>
                </section>
              </div>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </div>
  );
}
