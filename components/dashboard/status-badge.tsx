import { Badge } from '@/components/ui/badge';
import type { WorkflowStatus } from '@/lib/types';

const statusMap: Record<
  WorkflowStatus,
  {
    label: string;
    variant: 'neutral' | 'success' | 'danger' | 'warning';
  }
> = {
  draft: {
    label: 'Draft',
    variant: 'neutral',
  },
  in_review: {
    label: 'In Review',
    variant: 'warning',
  },
  changes_requested: {
    label: 'Changes Requested',
    variant: 'danger',
  },
  ready: {
    label: 'Ready',
    variant: 'success',
  },
};

export function StatusBadge({ status }: { status: WorkflowStatus }) {
  const config = statusMap[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
