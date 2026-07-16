import { SubtaskList, type SubtaskListItem } from './subtask-list';
import { StatusBadge } from './status-badge';

type TaskDetailProps = {
  id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED' | 'ARCHIVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  subtasks: SubtaskListItem[];
};

export function TaskDetail({ id, title, status, priority, subtasks }: TaskDetailProps) {
  return (
    <div className="space-y-6">
      <section aria-labelledby="task-detail-title" className="rounded-2xl border border-line bg-white p-6 shadow-lift">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Task</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 id="task-detail-title" className="text-3xl font-semibold text-ink">
            {title}
          </h2>
          <StatusBadge status={status} />
        </div>
        <p className="mt-2 text-sm text-slate-600">Task ID: {id}</p>
        <p className="mt-2 text-sm font-semibold text-slate-700">Priority: {priority}</p>
      </section>
      <section aria-labelledby="subtask-list-title" className="space-y-3">
        <h3 id="subtask-list-title" className="text-lg font-semibold text-ink">
          Subtasks
        </h3>
        <SubtaskList subtasks={subtasks} />
      </section>
    </div>
  );
}
