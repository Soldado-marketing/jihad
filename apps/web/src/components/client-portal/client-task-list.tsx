import Link from 'next/link';
import { EmptyState } from '@/components/states/empty-state';
import { StatusBadge } from '@/components/tasks/status-badge';

export type ClientTaskListItem = {
  id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED' | 'ARCHIVED';
};

export function ClientTaskList({ tasks }: { tasks: ClientTaskListItem[] }) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        title="No visible tasks"
        description="Approved task information will appear here when it is available for your account."
      />
    );
  }

  return (
    <ul className="divide-y divide-line rounded-md border border-line bg-panel" aria-label="Client task list">
      {tasks.map((task) => (
        <li key={task.id}>
          <Link className="block p-4 hover:bg-slate-50 focus-visible:bg-slate-50" href={`/client/tasks/${task.id}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-semibold text-ink">{task.title}</span>
              <StatusBadge status={task.status} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
