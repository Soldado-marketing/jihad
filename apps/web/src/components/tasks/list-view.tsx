'use client';

import { Task, PRIORITY_META, STATUS_META, getInitials, avatarColor, formatDueDate } from './task-types';

type ListViewProps = {
  tasks: Task[];
  onTaskOpen: (task: Task) => void;
};

export function ListView({ tasks, onTaskOpen }: ListViewProps) {
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
      <div className="grid grid-cols-[1fr_120px_100px_120px_120px_44px] gap-3 px-4 py-2.5 border-b border-line bg-soft text-[11px] font-semibold uppercase tracking-wide text-muted">
        <span>Title</span>
        <span>Status</span>
        <span>Priority</span>
        <span>Assignee</span>
        <span>Due Date</span>
        <span />
      </div>

      {/* Rows */}
      <div className="divide-y divide-line">
        {tasks.map((task) => {
          const priority = task.priority ? PRIORITY_META[task.priority] : null;
          const status = STATUS_META[task.status];
          const due = formatDueDate(task.dueAt);

          return (
            <button
              key={task.id}
              onClick={() => onTaskOpen(task)}
              className="grid grid-cols-[1fr_120px_100px_120px_120px_44px] gap-3 px-4 py-3 w-full text-left hover:bg-soft/80 transition-colors group"
            >
              {/* Title */}
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate group-hover:text-accent transition-colors">
                  {task.title}
                </p>
                {task.project && (
                  <p className="text-[11px] text-muted truncate">{task.project.name}</p>
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
              <div>
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
              <div>
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
              <div>
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
              <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3l5 5-5 5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
