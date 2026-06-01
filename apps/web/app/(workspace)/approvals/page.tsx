import { ApprovalList, type ApprovalListItem } from '@/components/approvals/approval-list';

const sprint6Approvals: ApprovalListItem[] = [
  {
    id: 'sprint-6-approval-placeholder',
    status: 'REQUESTED',
    title: 'Sprint 6 Approval Placeholder',
  },
];

export default function ApprovalsPage() {
  return (
    <div className="space-y-6">
      <section aria-labelledby="approvals-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Approval foundation
        </p>
        <h2 id="approvals-title" className="mt-2 text-3xl font-semibold text-ink">
          Approvals
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Approval request and decision placeholders for file review workflows.
        </p>
      </section>
      <ApprovalList approvals={sprint6Approvals} />
    </div>
  );
}
