'use client';

import { use, useEffect, useState } from 'react';
import { ClientTaskDetail } from '@/components/client-portal/client-task-detail';
import { apiFetch } from '@/lib/fetch';

type Task = { id: string; title: string; status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED' | 'ARCHIVED' };

type ClientTaskPageProps = {
  params: Promise<{ id: string }>;
};

export default function ClientTaskPage({ params }: ClientTaskPageProps) {
  const { id } = use(params);
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Task>(`/client/tasks/${id}`)
      .then(setTask)
      .catch(() => setTask(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-sm text-slate-500 p-6">Loading…</p>;
  if (!task) return <p className="text-sm text-red-500 p-6">Task not found or not accessible.</p>;

  return <ClientTaskDetail id={task.id} title={task.title} status={task.status} />;
}
