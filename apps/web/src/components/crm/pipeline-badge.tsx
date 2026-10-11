import { StatusBadge } from '@/components/ui/status-badge';

export type PipelineStatus =
  | 'LEAD'
  | 'CONTACTED'
  | 'MEETING'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST';

const labels: Record<PipelineStatus, string> = {
  CONTACTED: 'Contacted',
  LEAD: 'Lead',
  LOST: 'Lost',
  MEETING: 'Meeting',
  NEGOTIATION: 'Negotiation',
  PROPOSAL: 'Proposal',
  WON: 'Won',
};

/** Pipeline stage badge: the shared StatusBadge (MAOS-T61). */
export function PipelineBadge({ status }: { status: PipelineStatus }) {
  return <StatusBadge status={status} label={labels[status]} />;
}
