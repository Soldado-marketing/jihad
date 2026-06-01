import { ApprovalDetail } from '@/components/approvals/approval-detail';

type ApprovalDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ApprovalDetailPage({ params }: ApprovalDetailPageProps) {
  const { id } = await params;

  return (
    <ApprovalDetail
      id={id}
      status="REQUESTED"
      title="Sprint 6 Approval Placeholder"
    />
  );
}
