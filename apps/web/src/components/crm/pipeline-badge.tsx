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

export function PipelineBadge({ status }: { status: PipelineStatus }) {
  return (
    <span className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-slate-600">
      {labels[status]}
    </span>
  );
}
