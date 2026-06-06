'use client';

import { useMemo, useState } from 'react';
import { StatusBadge } from './status-badge';
import type { TaskListItem } from './task-list';

const columns: Array<{
  id: TaskListItem['status'];
  label: string;
  description: string;
}> = [
  { description: 'Ready to start', id: 'TODO', label: 'To do' },
  { description: 'Currently moving', id: 'IN_PROGRESS', label: 'Doing' },
  { description: 'Needs review', id: 'IN_REVIEW', label: 'Review' },
  { description: 'Finished work', id: 'DONE', label: 'Done' },
  { description: 'Needs unblock', id: 'BLOCKED', label: 'Blocked' },
];

const orderedStatuses = columns.map((column) => column.id);

type TaskKanbanPreviewProps = {
  tasks: TaskListItem[];
};

export function TaskKanbanPreview({ tasks }: TaskKanbanPreviewProps) {
  const [cards, setCards] = useState(tasks);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const groupedCards = useMemo(
    () =>
      columns.map((column) => ({
        ...column,
        cards: cards.filter((task) => task.status === column.id),
      })),
    [cards],
  );

  function moveTask(taskId: string, status: TaskListItem['status']) {
    setCards((currentCards) =>
      currentCards.map((task) => (task.id === taskId ? { ...task, status } : task)),
    );
  }

  function moveByStep(task: TaskListItem, direction: -1 | 1) {
    const currentIndex = orderedStatuses.indexOf(task.status);
    const nextStatus = orderedStatuses[currentIndex + direction];

    if (nextStatus) {
      moveTask(task.id, nextStatus);
    }
  }

  return (
    <section aria-labelledby="kanban-preview-title" className="rounded-md border border-line bg-panel p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            Kanban preview
          </p>
          <h3 id="kanban-preview-title" className="mt-2 text-xl font-semibold tracking-tight text-ink">
            Move work like a board
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Drag cards between columns or use the move buttons. Changes stay in this local
            preview until the API and database are connected.
          </p>
        </div>
        <span className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">
          Local only
        </span>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-5">
        {groupedCards.map((column) => (
          <section
            aria-label={`${column.label} column`}
            className="min-h-48 rounded-md border border-line bg-soft p-3"
            key={column.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (draggedTaskId) {
                moveTask(draggedTaskId, column.id);
                setDraggedTaskId(null);
              }
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold text-ink">{column.label}</h4>
                <p className="mt-1 text-xs text-slate-500">{column.description}</p>
              </div>
              <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                {column.cards.length}
              </span>
            </div>

            <div className="mt-3 space-y-3">
              {column.cards.map((task) => (
                <article
                  className="cursor-grab rounded-md border border-line bg-white p-3 shadow-[0_12px_28px_-26px_rgba(15,23,42,0.7)] active:cursor-grabbing"
                  draggable
                  key={task.id}
                  onDragStart={() => setDraggedTaskId(task.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="text-sm font-semibold leading-5 text-ink">{task.title}</h5>
                    <StatusBadge status={task.status} />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Priority: {task.priority}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      disabled={orderedStatuses.indexOf(task.status) === 0}
                      onClick={() => moveByStep(task, -1)}
                      type="button"
                    >
                      Back
                    </button>
                    <button
                      className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      disabled={orderedStatuses.indexOf(task.status) === orderedStatuses.length - 1}
                      onClick={() => moveByStep(task, 1)}
                      type="button"
                    >
                      Move
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
