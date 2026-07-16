import { EmptyState } from '@/components/states/empty-state';
import { StatusBadge } from './status-badge';

export type SubtaskListItem = {
  id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED' | 'ARCHIVED';
};

type SubtaskListProps = {
  subtasks: SubtaskListItem[];
};

export function SubtaskList({ subtasks }: SubtaskListProps) {
  if (subtasks.length === 0) {
    return (
      <EmptyState
        title="No subtasks yet"
        description="Break work into smaller checklist items after live task persistence is connected."
      />
    );
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-lift" aria-label="Subtask list">
      {subtasks.map((subtask) => (
        <li key={subtask.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
          <span className="text-sm font-medium text-ink">{subtask.title}</span>
          <StatusBadge status={subtask.status} />
        </li>
      ))}
    </ul>
  );
}
