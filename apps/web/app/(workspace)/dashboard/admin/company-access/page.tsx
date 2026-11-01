'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetch';
import { getStoredUser } from '@/lib/auth';
import { INVITE_ROLES, type InviteRole } from '@/lib/invites';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { StatusBadge } from '@/components/ui/status-badge';

type CustomerOption = { id: string; name: string };
const roleLabel = (role: string) => INVITE_ROLES.find((r) => r.value === role)?.label ?? (role === 'OWNER' ? 'Owner' : role);
const errorText = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

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

  // Edit role and Remove both ask first; the API decides and records the change.
  const [roleTarget, setRoleTarget] = useState<Member | null>(null);
  const [newRole, setNewRole] = useState<InviteRole>('EMPLOYEE');
  const [customerId, setCustomerId] = useState('');
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');

  function openRoleDialog(member: Member) {
    setRoleTarget(member);
    setNewRole((INVITE_ROLES.find((r) => r.value !== member.role)?.value ?? 'EMPLOYEE') as InviteRole);
    setCustomerId('');
    setDialogError('');
    void apiFetch<CustomerOption[]>('/customers?status=ACTIVE').then(setCustomers).catch(() => setCustomers([]));
  }

  function closeDialogs() {
    setRoleTarget(null);
    setRemoveTarget(null);
    setDialogError('');
  }

  async function confirmDialog(run: () => Promise<unknown>, fallback: string) {
    setDialogBusy(true);
    setDialogError('');
    try {
      await run();
      setMembers(await apiFetch<Member[]>('/auth/company-members'));
      closeDialogs();
    } catch (err) {
      setDialogError(errorText(err, fallback));
    } finally {
      setDialogBusy(false);
    }
  }

  const changeRole = (member: Member) => confirmDialog(() => apiFetch(`/admin/users/${encodeURIComponent(member.userId)}/role`, {
    method: 'PATCH',
    body: JSON.stringify(newRole === 'CLIENT' ? { role: newRole, customerId } : { role: newRole }),
  }), 'The role could not be changed.');

  const removeMember = (member: Member) => confirmDialog(() => apiFetch(`/auth/company-members/${encodeURIComponent(member.userId)}/remove`, {
    method: 'POST',
  }), 'The member could not be removed.');

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
      <p className="text-sm text-slate-600">
        Changing a role removes the permissions given for the old role. Removing a member
        ends their access to this company at once; their MAOS account and their other
        companies stay, and you can invite them again later. Owners are not changed here.
      </p>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      {!loaded && <p className="text-sm">Loading team members…</p>}
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50"><tr>
            <th className="p-3">Member</th><th className="p-3">Role</th>
            <th className="p-3">Status</th><th className="p-3">Company switching</th>
            <th className="p-3">Permissions in this company</th>
            <th className="p-3">Membership</th>
          </tr></thead>
          <tbody>
            {members.map((member) => (
              <tr className="border-t border-line" key={member.userId}>
                <td className="p-3">{member.displayName ?? member.email}
                  <span className="block text-xs text-slate-500">{member.email}</span>
                </td>
                <td className="p-3">{roleLabel(member.role)}</td>
                <td className="p-3"><StatusBadge status={member.status} /></td>
                <td className="p-3">
                  {member.role === 'OWNER' ? 'Always allowed' : member.status === 'REMOVED' ? <span className="text-slate-500">—</span> : (
                    <button type="button" disabled={busy !== null || member.status !== 'ACTIVE'}
                      className="rounded-lg border border-line px-3 py-1.5 text-sm disabled:opacity-50"
                      onClick={() => void update(member)}>
                      {member.canSwitch ? 'Revoke access' : 'Allow switching'}
                    </button>
                  )}
                </td>
                <td className="p-3">
                  {member.role === 'OWNER' ? 'Everything' : member.status === 'REMOVED' ? <span className="text-slate-500">—</span> : (
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
                <td className="p-3">
                  {member.role === 'OWNER' || member.status === 'REMOVED' ? <span className="text-slate-500">—</span> : (
                    <div className="flex flex-wrap gap-2">
                      {member.status === 'ACTIVE' && (
                        <button type="button" disabled={busy !== null}
                          className="rounded-lg border border-line px-3 py-1.5 text-sm disabled:opacity-50"
                          onClick={() => openRoleDialog(member)}>
                          Edit role
                        </button>
                      )}
                      <button type="button" disabled={busy !== null}
                        className="whitespace-nowrap rounded-lg border border-line px-3 py-1.5 text-sm text-destructive disabled:opacity-50"
                        onClick={() => { setDialogError(''); setRemoveTarget(member); }}>
                        Remove from company
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {roleTarget && (
        <ConfirmDialog title="Change role" confirmLabel="Change role" busy={dialogBusy} error={dialogError}
          confirmDisabled={newRole === roleTarget.role || (newRole === 'CLIENT' && !customerId)}
          onCancel={closeDialogs} onConfirm={() => void changeRole(roleTarget)}>
          <p><strong className="text-ink">{roleTarget.displayName ?? roleTarget.email}</strong> is {roleLabel(roleTarget.role)} in this company.</p>
          <label className="block">
            <span className="mb-1 block font-medium text-ink">New role</span>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value as InviteRole)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink">
              {INVITE_ROLES.filter((r) => r.value !== roleTarget.role).map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>
          {newRole === 'CLIENT' && (
            <label className="block">
              <span className="mb-1 block font-medium text-ink">Customer</span>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink">
                <option value="">{customers.length ? 'Choose a customer' : 'No active customers'}</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <span className="mt-1 block text-xs">A client sees only this customer&apos;s shared work, in the client portal.</span>
            </label>
          )}
          <p>The permissions given for the current role are removed. The new role applies at the member&apos;s next request.</p>
        </ConfirmDialog>
      )}

      {removeTarget && (
        <ConfirmDialog title="Remove from company" confirmLabel="Remove" danger busy={dialogBusy} error={dialogError}
          onCancel={closeDialogs} onConfirm={() => void removeMember(removeTarget)}>
          <p>Remove <strong className="text-ink">{removeTarget.displayName ?? removeTarget.email}</strong> from this company?</p>
          <p>They lose access to this company at once and are signed out of it. Their MAOS account and their other companies are not affected. Their tasks and history stay.</p>
        </ConfirmDialog>
      )}
    </main>
  );
}
