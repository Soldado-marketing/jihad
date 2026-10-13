'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageTransition } from '@/components/motion';
import { LoadingState } from '@/components/states/loading-state';
import { apiFetch } from '@/lib/fetch';
import {
  canRevoke,
  invitePayload,
  INVITE_ROLES,
  INVITE_STATUS_LABEL,
  INVITE_TTL_HOURS,
  type InviteRole,
  type InviteStatus,
} from '@/lib/invites';

/**
 * Invitations (MAOS F-2, OWNER only - the API checks the membership). The
 * OWNER invites an email into a role; the person accepts through the emailed
 * link. Without a configured mailer the link is shown once here, to pass on
 * personally; it is never stored in plain text and cannot be shown again.
 */

interface CustomerOption {
  id: string;
  name: string;
  status: string;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  customer?: { id: string; name: string } | null;
  status: InviteStatus;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

interface CreateResult {
  invite: Invite;
  delivery: 'emailed' | 'not_sent';
  inviteUrl?: string;
}

const STATUS_BADGE: Record<InviteStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SENT: 'bg-amber-100 text-amber-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  EXPIRED: 'bg-slate-100 text-slate-600',
  REVOKED: 'bg-red-100 text-red-700',
};

export default function InvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>('EMPLOYEE');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customerId, setCustomerId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      setInvites(await apiFetch<Invite[]>('/admin/invites'));
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : 'Failed to load invitations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    apiFetch<CustomerOption[]>('/customers?status=ACTIVE')
      .then(setCustomers)
      .catch(() => setCustomers([]));
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const payload = invitePayload(email.trim(), role, customerId);
    if (!payload) {
      setFormError('Choose the customer this client belongs to.');
      return;
    }
    setBusy(true);
    setFormError(null);
    setResult(null);
    setCopied(false);
    try {
      const created = await apiFetch<CreateResult>('/admin/invites', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setResult(created);
      setEmail('');
      void load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'The invitation could not be created.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(id: string) {
    setRowError((prev) => ({ ...prev, [id]: '' }));
    try {
      await apiFetch(`/admin/invites/${id}/revoke`, { method: 'POST' });
      void load();
    } catch (err: unknown) {
      setRowError((prev) => ({ ...prev, [id]: err instanceof Error ? err.message : 'Revoke failed.' }));
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const inputCls =
    'rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent';

  return (
    <PageTransition className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Invitations</h1>
        <p className="mt-1 text-sm text-muted">
          Invite a team member or a client by email. The link works once and expires after {INVITE_TTL_HOURS} hours. A
          client invite belongs to one customer and sees only that customer's work.
        </p>
      </div>

      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-panel p-4">
        <div className="flex min-w-[16rem] flex-1 flex-col gap-1">
          <label htmlFor="invite-email" className="text-sm font-medium text-ink">Email</label>
          <input
            id="invite-email" type="email" required maxLength={320}
            value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="invite-role" className="text-sm font-medium text-ink">Role</label>
          <select id="invite-role" value={role} onChange={(e) => setRole(e.target.value as InviteRole)} className={inputCls}>
            {INVITE_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        {role === 'CLIENT' && (
          <div className="flex min-w-[14rem] flex-col gap-1">
            <label htmlFor="invite-customer" className="text-sm font-medium text-ink">Customer</label>
            <select id="invite-customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputCls}>
              <option value="">{customers.length ? 'Choose a customer' : 'No active customers'}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-50"
        >
          {busy ? 'Sending…' : 'Send invitation'}
        </button>
        {formError && <p role="alert" className="w-full text-sm text-danger">{formError}</p>}
      </form>

      {result && result.delivery === 'emailed' && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          Invitation emailed to {result.invite.email}.
        </div>
      )}
      {result && result.delivery === 'not_sent' && result.inviteUrl && (
        <div className="space-y-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p>
            Email is not configured, so nothing was sent. Pass this link to {result.invite.email} personally. It is
            shown only now and works once.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="break-all rounded bg-white/70 px-2 py-1 text-xs">{result.inviteUrl}</code>
            <button
              type="button"
              onClick={() => void copyLink(result.inviteUrl as string)}
              className="rounded border border-amber-300 px-2 py-1 text-xs hover:bg-amber-100"
            >
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
        </div>
      )}

      {pageError && <div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{pageError}</div>}

      {loading ? (
        <LoadingState />
      ) : invites.length === 0 ? (
        <p className="text-sm text-muted">No invitations yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-soft text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-ink">Email</th>
                <th className="px-4 py-3 font-medium text-ink">Role</th>
                <th className="px-4 py-3 font-medium text-ink">Status</th>
                <th className="px-4 py-3 font-medium text-ink">Expires</th>
                <th className="px-4 py-3 font-medium text-ink">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {invites.map((inv) => (
                <tr key={inv.id} className="bg-panel">
                  <td className="px-4 py-3 text-ink">{inv.email}</td>
                  <td className="px-4 py-3 text-muted">
                    {INVITE_ROLES.find((r) => r.value === inv.role)?.label ?? inv.role}
                    {inv.customer && <span className="ml-1 text-xs text-slate-500">· {inv.customer.name}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[inv.status]}`}>
                      {INVITE_STATUS_LABEL[inv.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{new Date(inv.expiresAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {canRevoke(inv.status) ? (
                      <button
                        type="button"
                        onClick={() => void handleRevoke(inv.id)}
                        className="text-sm text-danger hover:underline"
                      >
                        Revoke
                      </button>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                    {rowError[inv.id] && <p className="mt-1 text-xs text-danger">{rowError[inv.id]}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageTransition>
  );
}
