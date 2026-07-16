'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetch';
import { PageHeader } from '@/components/ui/page-header';

type Approval = { id: string; status: string; clientVisible: boolean; createdAt: string; decisions?: any[] };

export default function ApprovalsPage() {
  const [items, setItems] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  async function load() {
    try { setItems(await apiFetch<Approval[]>('/approvals')); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function decide(id: string, decision: 'APPROVE' | 'REJECT') {
    try {
      await apiFetch(`/approvals/${id}/decision`, { method: 'POST', body: JSON.stringify({ decision, note: '' }) });
      load();
    } catch (e: any) { alert(e.message); }
  }

  const STATUS_COLORS: Record<string, string> = {
    REQUESTED: 'bg-amber-100 text-amber-700', APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700', CHANGES_REQUESTED: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Workspace" title="Approvals" description="Review and approve requests." />
      {loading && <p className="text-sm text-muted">Loading…</p>}
      {!loading && items.length === 0 && <p className="text-center text-sm text-muted py-8">No approval requests yet.</p>}
      <ul className="divide-y divide-line rounded-xl border border-line bg-white overflow-hidden">
        {items.map(a => (
          <li key={a.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50">
            <div>
              <p className="text-sm font-medium text-ink">Approval #{a.id.slice(-6)}</p>
              <p className="text-xs text-muted mt-0.5">
                {a.clientVisible ? 'Client visible' : 'Internal'} · {new Date(a.createdAt).toLocaleDateString()}
                {a.decisions?.length ? ` · ${a.decisions.length} decision(s)` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[a.status] ?? 'bg-slate-100 text-slate-600'}`}>{a.status}</span>
              {a.status === 'REQUESTED' && (
                <>
                  <button onClick={() => decide(a.id, 'APPROVE')}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">Approve</button>
                  <button onClick={() => decide(a.id, 'REJECT')}
                    className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600">Reject</button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}