'use client';

import { useCallback, use, useEffect, useState } from 'react';
import { ErrorState } from '@/components/states/error-state';
import { ApprovalDetail } from '@/components/approvals/approval-detail';
import { type ApprovalStatus } from '@/components/approvals/approval-status-badge';
import { apiFetch } from '@/lib/fetch';

type Approval = { id: string; title: string; status: ApprovalStatus };

export default function ApprovalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [approval, setApproval] = useState<Approval | null>(null);
  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState<string | null>(null);
  const load = useCallback(() => {
    setLoading(true); setLoadError(null);
    apiFetch<Approval>(`/approvals/${id}`)
      .then(setApproval)
      // Any failure used to read "not found"; now the reason is shown and the load can be repeated (F04).
      .catch((err) => { setApproval(null); setLoadError(err instanceof Error ? err.message : 'Approval request not found.'); })
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-sm text-slate-500 p-6">Loading…</p>;
  if (!approval) return <div className="p-6"><ErrorState title="This approval request could not be opened" message={loadError ?? 'Approval request not found.'} onRetry={load} /></div>;

  return <ApprovalDetail id={approval.id} title={approval.title} status={approval.status} />;
}
