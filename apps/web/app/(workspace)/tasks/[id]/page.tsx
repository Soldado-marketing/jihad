'use client';

import { useCallback, use, useEffect, useState } from 'react';
import { ErrorState } from '@/components/states/error-state';
import { TaskDetail } from '@/components/tasks/task-detail';
import { type SubtaskListItem } from '@/components/tasks/subtask-list';
import { apiFetch } from '@/lib/fetch';

type Task = {
  id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED' | 'ARCHIVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
};

type TaskDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { id } = use(params);
  const [task, setTask] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<SubtaskListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [subtasksError, setSubtasksError] = useState<string | null>(null);
  const load = useCallback(() => {
    setLoading(true); setLoadError(null); setSubtasksError(null);
    Promise.all([
      apiFetch<Task>(`/tasks/${id}`),
      // The subtasks load on their own so the task still opens; a failure is said, not shown as "no subtasks" (F04).
      apiFetch<SubtaskListItem[]>(`/tasks/${id}/subtasks`).catch((err) => {
        setSubtasksError(err instanceof Error ? err.message : 'Could not load the subtasks.');
        return [] as SubtaskListItem[];
      }),
    ])
      .then(([t, s]) => {
        setTask(t);
        setSubtasks(s);
      })
      // Any failure used to read "not found"; now the reason is shown and the load can be repeated (F04).
      .catch((err) => { setTask(null); setLoadError(err instanceof Error ? err.message : 'Task not found.'); })
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-sm text-slate-500 p-6">Loading…</p>;
  if (!task) return <div className="p-6"><ErrorState title="This task could not be opened" message={loadError ?? 'Task not found.'} onRetry={load} /></div>;

  return (
    <>
      {subtasksError && <div className="px-6 pt-6"><ErrorState title="The subtasks could not be loaded" message={subtasksError} onRetry={load} /></div>}
      <TaskDetail
        id={task.id}
        title={task.title}
        status={task.status}
        priority={task.priority ?? 'MEDIUM'}
        subtasks={subtasks}
      />
    </>
  );
}
