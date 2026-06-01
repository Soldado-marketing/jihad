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
        description="Subtask CRUD skeletons exist in the API baseline and can be connected in later UI work."
      />
    );
  }

  return (
    <ul className="divide-y divide-line rounded-md border border-line bg-panel" aria-label="Subtask list">
      {subtasks.map((subtask) => (
        <li key={subtask.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <span className="text-sm font-medium text-ink">{subtask.title}</span>
          <StatusBadge status={subtask.status} />
        </li>
      ))}
    </ul>
  );
}
