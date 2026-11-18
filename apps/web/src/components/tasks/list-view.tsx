'use client';

import { useEffect, useRef } from 'react';
import { selectionState } from '@/lib/bulk-tasks';
import { Task, PRIORITY_META, STATUS_META, getInitials, avatarColor, formatDueDate } from './task-types';

type ListViewProps = {
  tasks: Task[];
  onTaskOpen: (task: Task) => void;
  /** Selection for bulk actions (G10). Without it the list has no checkboxes. */
  selection?: {
    selected: ReadonlySet<string>;
    onToggle: (taskId: string) => void;
    onToggleAll: () => void;
  };
};

/**
 * Below the wide layout the five fixed columns left no room for the title at
 * all (on a phone the list showed statuses and no task names). There the row
 * is the title with a line of details under it, and the status; the full
 * columns come back where they fit.
 */
const COLUMNS = 'grid-cols-[minmax(0,1fr)_auto] xl:grid-cols-[1fr_120px_100px_120px_120px_44px]';

/** The header box is half-set while only some of the shown tasks are selected. */
function SelectAll({ state, onChange }: { state: 'none' | 'some' | 'all'; onChange: () => void }) {
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => { if (box.current) box.current.indeterminate = state === 'some'; }, [state]);
  return (
    <input
      ref={box}
      type="checkbox"
      aria-label="Select all tasks shown"
      checked={state === 'all'}
      onChange={onChange}
      className="h-4 w-4 rounded border-line accent-[#0f766e]"
    />
  );
}

export function ListView({ tasks, onTaskOpen, selection }: ListViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-2xl bg-canvas flex items-center justify-center mb-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="3" rx="1.5" fill="#d9e2ec"/>
            <rect x="3" y="10.5" width="13" height="3" rx="1.5" fill="#d9e2ec"/>
            <rect x="3" y="16" width="16" height="3" rx="1.5" fill="#d9e2ec"/>
          </svg>
        </div>
        <p className="text-sm font-medium text-ink">No tasks found</p>
        <p className="text-xs text-muted mt-1">Create a task or clear your filters</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-panel overflow-hidden shadow-[0_1px_4px_rgba(15,23,42,0.05)]">
      {/* Header */}
      <div className="flex items-stretch border-b border-line bg-soft">
        {selection && (
          <label className="flex w-10 shrink-0 items-center justify-center">
            <SelectAll state={selectionState(selection.selected, tasks.map((task) => task.id))} onChange={selection.onToggleAll} />
          </label>
        )}
        <div className={`grid min-w-0 flex-1 ${COLUMNS} gap-3 py-2.5 pr-4 text-[11px] font-semibold uppercase tracking-wide text-muted ${selection ? 'pl-1' : 'pl-4'}`}>
          <span>Title</span>
          <span>Status</span>
          <span className="hidden xl:inline">Priority</span>
          <span className="hidden xl:inline">Assignee</span>
          <span className="hidden xl:inline">Due Date</span>
          <span className="hidden xl:inline" />
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-line">
        {tasks.map((task) => {
          const priority = task.priority ? PRIORITY_META[task.priority] : null;
          const status = STATUS_META[task.status];
          const due = formatDueDate(task.dueAt, task.status);
          const compact = [
            priority?.label,
            task.assignedTo ? (task.assignedTo.displayName ?? task.assignedTo.email.split('@')[0]) : null,
            due ? `${due.label}${due.overdue ? ' ⚠' : ''}` : null,
          ].filter((part): part is string => Boolean(part));

          return (
            <div key={task.id} className={`flex items-stretch ${selection?.selected.has(task.id) ? 'bg-accent/5' : ''}`}>
            {selection && (
              <label className="flex w-10 shrink-0 items-center justify-center">
                <input
                  type="checkbox"
                  aria-label={`Select ${task.title}`}
                  checked={selection.selected.has(task.id)}
                  onChange={() => selection.onToggle(task.id)}
                  className="h-4 w-4 rounded border-line accent-[#0f766e]"
                />
              </label>
            )}
            <button
              onClick={() => onTaskOpen(task)}
              className={`grid min-w-0 flex-1 ${COLUMNS} gap-3 py-3 pr-4 text-left hover:bg-soft/80 transition-colors group ${selection ? 'pl-1' : 'pl-4'}`}
            >
              {/* Title */}
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate group-hover:text-accent transition-colors">
                  {task.title}
                </p>
                {task.project && (
                  <p className="text-[11px] text-muted truncate">{task.project.name}</p>
                )}
                {/* The details the hidden columns carry, on one line, where the columns do not fit. */}
                {compact.length > 0 && (
                  <p className="truncate text-[11px] text-muted xl:hidden">{compact.join(' · ')}</p>
                )}
              </div>

              {/* Status */}
              <div>
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{ color: status.color, backgroundColor: status.bg }}
                >
                  {status.label}
                </span>
              </div>

              {/* Priority */}
              <div className="hidden xl:block">
                {priority ? (
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{ color: priority.color, backgroundColor: priority.bg }}
                  >
                    {priority.label}
                  </span>
                ) : (
                  <span className="text-[11px] text-muted">—</span>
                )}
              </div>

              {/* Assignee */}
              <div className="hidden xl:block">
                {task.assignedTo ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ backgroundColor: avatarColor(task.assignedTo.id) }}
                    >
                      {getInitials(task.assignedTo.displayName, task.assignedTo.email)}
                    </div>
                    <span className="text-[11px] text-ink truncate max-w-[72px]">
                      {task.assignedTo.displayName ?? task.assignedTo.email.split('@')[0]}
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] text-muted">—</span>
                )}
              </div>

              {/* Due */}
              <div className="hidden xl:block">
                {due ? (
                  <span
                    className="text-[11px]"
                    style={{ color: due.overdue ? '#b42318' : '#667085' }}
                  >
                    {due.label}
                    {due.overdue && ' ⚠'}
                  </span>
                ) : (
                  <span className="text-[11px] text-muted">—</span>
                )}
              </div>

              {/* Chevron */}
              <div className="hidden items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 xl:flex">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3l5 5-5 5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
