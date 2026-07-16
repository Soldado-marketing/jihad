'use client';

import { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TaskCard } from './task-card';
import { Task, TaskStatus, FileAttachment, COLUMNS } from './task-types';

type KanbanBoardProps = {
  tasks: Task[];
  files: FileAttachment[];
  onTaskOpen: (task: Task) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<void>;
  onQuickCreate: (status: TaskStatus, title: string) => Promise<void>;
};

export function KanbanBoard({
  tasks,
  files,
  onTaskOpen,
  onStatusChange,
  onQuickCreate,
}: KanbanBoardProps) {
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const [quickCreate, setQuickCreate] = useState<TaskStatus | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const dragTaskId = useRef<string | null>(null);

  function handleDragStart(e: React.DragEvent, taskId: string) {
    dragTaskId.current = taskId;
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(status);
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only clear when leaving the column itself, not entering a child
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDragOverCol(null);
    }
  }

  async function handleDrop(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = dragTaskId.current;
    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === status) return;
    dragTaskId.current = null;
    await onStatusChange(taskId, status);
  }

  function handleDragEnd() {
    setDragOverCol(null);
    dragTaskId.current = null;
  }

  async function submitQuickCreate(status: TaskStatus) {
    const title = quickTitle.trim();
    if (!title || saving) return;
    setSaving(true);
    try {
      await onQuickCreate(status, title);
      setQuickTitle('');
      setQuickCreate(null);
    } finally {
      setSaving(false);
    }
  }

  function attachCountForTask(taskId: string) {
    return files.filter((f) => f.taskId === taskId).length;
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 pr-2 min-h-0 flex-1">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.status);
        const isDragOver = dragOverCol === col.status;

        return (
          <div
            key={col.status}
            className="flex flex-col shrink-0 w-72"
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.status)}
            onDragEnd={handleDragEnd}
          >
            {/* Column header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: col.color }}
                />
                <span className="text-sm font-semibold text-ink">{col.label}</span>
                <span className="text-xs text-muted bg-canvas rounded-full px-1.5 py-0.5 font-medium">
                  {colTasks.length}
                </span>
              </div>
              <button
                onClick={() => { setQuickCreate(col.status); setQuickTitle(''); }}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-muted hover:text-accent hover:bg-canvas transition-colors"
                title="Add task"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Drop zone */}
            <motion.div
              className={`flex-1 flex flex-col gap-2.5 rounded-2xl p-2.5 transition-colors min-h-[120px] ${
                isDragOver
                  ? 'bg-accent/5 ring-2 ring-accent/30 ring-dashed'
                  : 'bg-soft/60'
              }`}
              animate={{ scale: isDragOver ? 1.005 : 1 }}
              transition={{ duration: 0.12 }}
            >
              <AnimatePresence>
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    attachmentCount={attachCountForTask(task.id)}
                    onOpen={onTaskOpen}
                    onDragStart={handleDragStart}
                  />
                ))}
              </AnimatePresence>

              {/* Empty state */}
              {colTasks.length === 0 && !isDragOver && quickCreate !== col.status && (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-xs text-muted/60 text-center select-none">
                    Drop tasks here
                  </p>
                </div>
              )}

              {/* Quick create form */}
              <AnimatePresence>
                {quickCreate === col.status && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-xl border border-line bg-panel p-3 shadow-card">
                      <textarea
                        autoFocus
                        rows={2}
                        value={quickTitle}
                        onChange={(e) => setQuickTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            submitQuickCreate(col.status);
                          }
                          if (e.key === 'Escape') {
                            setQuickCreate(null);
                            setQuickTitle('');
                          }
                        }}
                        placeholder="Task title..."
                        className="w-full resize-none text-sm text-ink bg-transparent placeholder:text-muted/60 outline-none leading-snug"
                      />
                      <div className="flex items-center gap-2 mt-2.5">
                        <button
                          onClick={() => submitQuickCreate(col.status)}
                          disabled={!quickTitle.trim() || saving}
                          className="px-3 py-1 rounded-lg bg-brand text-white text-xs font-semibold disabled:opacity-40 hover:bg-accent transition-colors"
                        >
                          {saving ? 'Adding…' : 'Add'}
                        </button>
                        <button
                          onClick={() => { setQuickCreate(null); setQuickTitle(''); }}
                          className="px-3 py-1 rounded-lg text-muted text-xs hover:text-ink transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Add task footer button */}
            {quickCreate !== col.status && (
              <button
                onClick={() => { setQuickCreate(col.status); setQuickTitle(''); }}
                className="mt-2.5 flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-xs text-muted hover:text-accent hover:bg-canvas transition-colors w-full"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Add task
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
