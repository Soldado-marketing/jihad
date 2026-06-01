import { cn } from '@/lib/class-names';

type StatusBadgeProps = {
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED' | 'ARCHIVED';
};

const statusLabels: Record<StatusBadgeProps['status'], string> = {
  ARCHIVED: 'Archived',
  BLOCKED: 'Blocked',
  DONE: 'Done',
  IN_PROGRESS: 'In progress',
  IN_REVIEW: 'In review',
  TODO: 'To do',
};

const statusClasses: Record<StatusBadgeProps['status'], string> = {
  ARCHIVED: 'border-slate-300 bg-slate-100 text-slate-700',
  BLOCKED: 'border-danger/25 bg-danger/10 text-danger',
  DONE: 'border-accent/25 bg-accent/10 text-accent',
  IN_PROGRESS: 'border-blue-300 bg-blue-50 text-blue-700',
  IN_REVIEW: 'border-warning/25 bg-warning/10 text-warning',
  TODO: 'border-line bg-panel text-slate-600',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
        statusClasses[status],
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
