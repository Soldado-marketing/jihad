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
};

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
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      {!loaded && <p className="text-sm">Loading team members…</p>}
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50"><tr>
            <th className="p-3">Member</th><th className="p-3">Role</th>
            <th className="p-3">Status</th><th className="p-3">Company switching</th>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
