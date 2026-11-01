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

/** On/off switch that always states its current value in words, not only by colour. */
function Toggle({ label, on, disabled, onChange }: { label: string; on: boolean; disabled: boolean; onChange: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={onChange}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50 disabled:opacity-50">
      <span className="text-ink">{label}</span>
      <span className="flex shrink-0 items-center gap-2">
        <span className={`w-6 text-xs font-medium ${on ? 'text-accent' : 'text-slate-500'}`}>{on ? 'On' : 'Off'}</span>
        <span aria-hidden="true" className={`relative h-5 w-9 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-slate-300'}`}>
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
        </span>
      </span>
    </button>
  );
}

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
      {/* One card per member instead of a wide table, so every control stays visible on phones. */}
      <ul className="space-y-3">
        {members.map((member) => {
          const editable = member.role !== 'OWNER' && member.status !== 'REMOVED';
          const locked = busy !== null || member.status !== 'ACTIVE';
          const memberGrants = GRANTS.filter((g) => g.key in (member.grants ?? {}));
          return (
            <li key={member.userId}
              className={`rounded-xl border border-line bg-white p-4 text-sm ${member.status === 'REMOVED' ? 'opacity-70' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-medium text-ink">{member.displayName ?? member.email}</h2>
                  <p className="break-all text-xs text-slate-500">{member.email}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-slate-700">{roleLabel(member.role)}</span>
                    <StatusBadge status={member.status} />
                  </p>
                </div>
                {member.role === 'OWNER' || member.status === 'REMOVED' ? <span className="text-xs text-slate-500">{member.role === 'OWNER' ? 'Always allowed · Everything' : 'No access to this company'}</span> : (
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
              </div>
              {editable && (
                <div className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
                  <section>
                    <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Company switching</h3>
                    <Toggle label="Can switch to their other companies" on={member.canSwitch} disabled={locked}
                      onChange={() => void update(member)} />
                  </section>
                  <section>
                    <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Permissions in this company</h3>
                    {memberGrants.map((g) => (
                      <Toggle key={g.key} label={g.label} on={!!member.grants[g.key]} disabled={locked}
                        onChange={() => void toggleGrant(member, g.key)} />
                    ))}
                    {!memberGrants.length && <p className="px-2 py-1.5 text-xs text-slate-500">None for this role</p>}
                  </section>
                </div>
              )}
            </li>
          );
        })}
      </ul>

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
