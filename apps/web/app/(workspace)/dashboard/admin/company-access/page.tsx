'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetch';
import { getStoredUser } from '@/lib/auth';

type Member = {
  userId: string;
  email: string;
  displayName: string | null;
  role: string;
  status: string;
  canSwitch: boolean;
  explicitGrant: boolean | null;
  /** Explicit grants that apply to this member's role, and whether each is on. */
  grants: Partial<Record<Grant, boolean>>;
};
type Grant = 'decide-approvals' | 'invoices-read' | 'invoices-edit' | 'payments-record' | 'all-tasks';
const GRANTS: { key: Grant; label: string }[] = [
  { key: 'decide-approvals', label: 'Decides approvals' },
  { key: 'invoices-read', label: 'Views invoices' },
  { key: 'invoices-edit', label: 'Creates and sends invoices' },
  { key: 'payments-record', label: 'Records payments' },
  { key: 'all-tasks', label: 'Sees all tasks' },
];

/** Owner-only server-enforced exception management, scoped to current tenant. */
export default function CompanyAccessPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [owner, setOwner] = useState<boolean | null>(null);
  useEffect(() => { setOwner(getStoredUser()?.role === 'OWNER'); }, []);

  useEffect(() => {
    if (!owner) return;
    void apiFetch<Member[]>('/auth/company-members').then((data) => {
      setMembers(data);
      setLoaded(true);
    }).catch(() => {
      setError('Access denied or unable to load team members.');
      setLoaded(true);
    });
  }, [owner]);

  async function update(member: Member) {
    setBusy(member.userId);
    setError('');
    try {
      await apiFetch('/auth/company-members/' + encodeURIComponent(member.userId) + '/switch', {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !member.canSwitch }),
      });
      setMembers(await apiFetch<Member[]>('/auth/company-members'));
    } catch {
      setError('Permission update failed. Please retry.');
    } finally {
      setBusy(null);
    }
  }

  async function toggleGrant(member: Member, grant: Grant) {
    setBusy(member.userId);
    setError('');
    try {
      await apiFetch(`/auth/company-members/${encodeURIComponent(member.userId)}/grants/${grant}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !member.grants[grant] }),
      });
      setMembers(await apiFetch<Member[]>('/auth/company-members'));
    } catch {
      setError('Permission update failed. Please retry.');
    } finally {
      setBusy(null);
    }
  }

  if (owner === null) return <main className="p-6">Loading…</main>;
  if (!owner) return <main className="p-6">Access denied.</main>;
  return (
    <main className="space-y-4 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold text-ink">Company access</h1>
      <p className="text-sm text-slate-600">
        Company switching is enabled for owners and managers by default. Other members
        can switch only when explicitly allowed by a company owner and only to
        companies where they already hold active membership.
      </p>
      <p className="text-sm text-slate-600">
        Only you decide approvals unless you make a member an approver. Managers see,
        edit or record payments on invoices only as far as you allow it; the payment
        ledger and finance totals stay yours. Employees see the tasks assigned to them and
        the tasks of projects they are a member of, unless you let them see all tasks.
        Every change applies to this company only.
      </p>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      {!loaded && <p className="text-sm">Loading team members…</p>}
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50"><tr>
            <th className="p-3">Member</th><th className="p-3">Role</th>
            <th className="p-3">Status</th><th className="p-3">Company switching</th>
            <th className="p-3">Permissions in this company</th>
          </tr></thead>
          <tbody>
            {members.map((member) => (
              <tr className="border-t border-line" key={member.userId}>
                <td className="p-3">{member.displayName ?? member.email}
                  <span className="block text-xs text-slate-500">{member.email}</span>
                </td>
                <td className="p-3">{member.role}</td>
                <td className="p-3">{member.status}</td>
                <td className="p-3">
                  {member.role === 'OWNER' ? 'Always allowed' : (
                    <button type="button" disabled={busy !== null || member.status !== 'ACTIVE'}
                      className="rounded-lg border border-line px-3 py-1.5 text-sm disabled:opacity-50"
                      onClick={() => void update(member)}>
                      {member.canSwitch ? 'Revoke access' : 'Allow switching'}
                    </button>
                  )}
                </td>
                <td className="p-3">
                  {member.role === 'OWNER' ? 'Everything' : (
                    <div className="flex flex-wrap gap-2">
                      {GRANTS.filter((g) => g.key in (member.grants ?? {})).map((g) => (
                        <button key={g.key} type="button" aria-pressed={!!member.grants[g.key]}
                          disabled={busy !== null || member.status !== 'ACTIVE'}
                          className={`rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50 ${member.grants[g.key] ? 'border-accent bg-accent/10 font-medium text-ink' : 'border-line'}`}
                          onClick={() => void toggleGrant(member, g.key)}>
                          {member.grants[g.key] ? '✓ ' : ''}{g.label}
                        </button>
                      ))}
                      {!Object.keys(member.grants ?? {}).length && <span className="text-xs text-slate-500">None for this role</span>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
