'use client';

import { use, useEffect, useState } from 'react';
import { ApprovalDetail } from '@/components/approvals/approval-detail';
import { type ApprovalStatus } from '@/components/approvals/approval-status-badge';
import { apiFetch } from '@/lib/fetch';

type Approval = { id: string; title: string; status: ApprovalStatus };

export default function ApprovalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [approval, setApproval] = useState<Approval | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Approval>(`/approvals/${id}`)
      .then(setApproval)
      .catch(() => setApproval(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-sm text-slate-500 p-6">Loading…</p>;
  if (!approval) return <p className="text-sm text-red-500 p-6">Approval request not found.</p>;

  return <ApprovalDetail id={approval.id} title={approval.title} status={approval.status} />;
}
