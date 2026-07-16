'use client';

import { motion } from 'framer-motion';
import {
  Task,
  PRIORITY_META,
  getInitials,
  avatarColor,
  formatDueDate,
} from './task-types';


type TaskCardProps = {
  task: Task;
  attachmentCount: number;
  onOpen: (task: Task) => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
};

export function TaskCard({ task, attachmentCount, onOpen, onDragStart }: TaskCardProps) {
  const due = formatDueDate(task.dueAt);
  const priority = task.priority ? PRIORITY_META[task.priority] : null;
  const subtaskTotal = task._count.subtasks;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      draggable
      onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, task.id)}
      onClick={() => onOpen(task)}
      className="group relative cursor-pointer rounded-xl border border-line bg-panel p-3.5 shadow-[0_1px_4px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-[0_4px_16px_rgba(15,23,42,0.10)] active:scale-[0.99]"
    >
      {/* Priority strip */}
      {priority && (
        <div
          className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full"
          style={{ backgroundColor: priority.color }}
        />
      )}

      <div className="pl-2 space-y-2.5">
        {/* Priority + project row */}
        <div className="flex items-center gap-2 flex-wrap">
          {priority && (
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: priority.color, backgroundColor: priority.bg }}
            >
              {priority.label}
            </span>
          )}
          {task.project && (
            <span className="text-[11px] text-muted truncate max-w-[120px]">
              {task.project.name}
            </span>
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-medium text-ink leading-snug line-clamp-2 group-hover:text-accent transition-colors">
          {task.title}
        </p>

        {/* Label chips */}
        {task.labels && task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.labels.map(({ label }) => (
              <span
                key={label.id}
                className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white leading-none"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          {/* Meta chips */}
          <div className="flex items-center gap-2 text-[11px] text-muted">
            {subtaskTotal > 0 && (
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0">
                  <path d="M2 8h12M2 4h8M2 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {subtaskTotal}
              </span>
            )}
            {attachmentCount > 0 && (
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0">
                  <path d="M13.5 7.5l-5.5 5.5a3.5 3.5 0 01-4.95-4.95l5.5-5.5a2 2 0 012.83 2.83L5.88 11.37a.5.5 0 01-.71-.71L10 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {attachmentCount}
              </span>
            )}
            {due && (
              <span
                className="flex items-center gap-1"
                style={{ color: due.overdue ? '#b42318' : undefined }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0">
                  <rect x="1.5" y="2.5" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M1.5 6.5h13M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                {due.label}
                {due.overdue && <span className="text-danger">!</span>}
              </span>
            )}
          </div>

          {/* Assignee avatar */}
          {task.assignedTo && (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              style={{ backgroundColor: avatarColor(task.assignedTo.id) }}
              title={task.assignedTo.displayName ?? task.assignedTo.email}
            >
              {getInitials(task.assignedTo.displayName, task.assignedTo.email)}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
