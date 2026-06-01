import { StatusBadge } from '@/components/tasks/status-badge';
import { ClientSafeNotice } from './client-safe-notice';

type ClientTaskDetailProps = {
  id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED' | 'ARCHIVED';
};

export function ClientTaskDetail({ id, title, status }: ClientTaskDetailProps) {
  return (
    <div className="space-y-6">
      <section aria-labelledby="client-task-title" className="rounded-md border border-line bg-panel p-6 shadow-shell">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Task</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 id="client-task-title" className="text-3xl font-semibold text-ink">
            {title}
          </h2>
          <StatusBadge status={status} />
        </div>
        <p className="mt-2 text-sm text-slate-600">Reference: {id}</p>
      </section>
      <ClientSafeNotice />
    </div>
  );
}
