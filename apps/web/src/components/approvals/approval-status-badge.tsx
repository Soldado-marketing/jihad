export type ApprovalStatus =
  | 'DRAFT'
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED'
  | 'CANCELED';

const labels: Record<ApprovalStatus, string> = {
  APPROVED: 'Approved',
  CANCELED: 'Canceled',
  CHANGES_REQUESTED: 'Changes requested',
  DRAFT: 'Draft',
  REJECTED: 'Rejected',
  REQUESTED: 'Requested',
};

export function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  return (
    <span className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-slate-600">
      {labels[status]}
    </span>
  );
}
