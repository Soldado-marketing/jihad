import { StatusBadge as Badge } from '@/components/ui/status-badge';

type StatusBadgeProps = {
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED' | 'ARCHIVED';
};

/** Task status badge: the shared StatusBadge (MAOS-T61). */
export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge status={status} />;
}
