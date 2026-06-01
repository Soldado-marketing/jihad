import Link from 'next/link';
import { EmptyState } from '@/components/states/empty-state';
import { ApprovalStatusBadge, type ApprovalStatus } from './approval-status-badge';

export type ApprovalListItem = {
  id: string;
  title: string;
  status: ApprovalStatus;
};

export function ApprovalList({ approvals }: { approvals: ApprovalListItem[] }) {
  if (approvals.length === 0) {
    return (
      <EmptyState
        title="No approval requests yet"
        description="Sprint 6 reserves the approval request and decision foundation."
      />
    );
  }

  return (
    <ul className="divide-y divide-line rounded-md border border-line bg-panel" aria-label="Approval list">
      {approvals.map((approval) => (
        <li key={approval.id}>
          <Link className="block p-4 hover:bg-slate-50 focus-visible:bg-slate-50" href={`/approvals/${approval.id}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-semibold text-ink">{approval.title}</span>
              <ApprovalStatusBadge status={approval.status} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
