'use client';

import { useEffect, useState } from 'react';
import { ClientTaskList, type ClientTaskListItem } from '@/components/client-portal/client-task-list';
import { apiFetch } from '@/lib/fetch';

export default function ClientTasksPage() {
  const [tasks, setTasks] = useState<ClientTaskListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<ClientTaskListItem[]>('/client/tasks')
      .then(setTasks)
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <section aria-labelledby="client-tasks-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Client tasks</p>
        <h2 id="client-tasks-title" className="mt-2 text-3xl font-semibold text-ink">Tasks</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Tasks assigned to your account for review or approval.
        </p>
      </section>
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <ClientTaskList tasks={tasks} />
      )}
    </div>
  );
}
