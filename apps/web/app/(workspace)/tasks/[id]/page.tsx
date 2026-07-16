'use client';

import { use, useEffect, useState } from 'react';
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

  useEffect(() => {
    Promise.all([
      apiFetch<Task>(`/tasks/${id}`),
      apiFetch<SubtaskListItem[]>(`/tasks/${id}/subtasks`).catch(() => [] as SubtaskListItem[]),
    ])
      .then(([t, s]) => {
        setTask(t);
        setSubtasks(s);
      })
      .catch(() => setTask(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-sm text-slate-500 p-6">Loading…</p>;
  if (!task) return <p className="text-sm text-red-500 p-6">Task not found.</p>;

  return (
    <TaskDetail
      id={task.id}
      title={task.title}
      status={task.status}
      priority={task.priority ?? 'MEDIUM'}
      subtasks={subtasks}
    />
  );
}
