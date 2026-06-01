import Link from 'next/link';
import { EmptyState } from '@/components/states/empty-state';
import { StatusBadge } from './status-badge';

export type TaskListItem = {
  id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED' | 'ARCHIVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
};

type TaskListProps = {
  tasks: TaskListItem[];
};

export function TaskList({ tasks }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        title="No tasks yet"
        description="Task workflows start with the Sprint 3 backend skeleton and placeholder UI."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-line bg-panel shadow-shell">
      <ul className="divide-y divide-line" aria-label="Task list">
        {tasks.map((task) => (
          <li key={task.id}>
            <Link className="block p-4 hover:bg-slate-50 focus-visible:bg-slate-50" href={`/tasks/${task.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-ink">{task.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">Priority: {task.priority}</p>
                </div>
                <StatusBadge status={task.status} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
