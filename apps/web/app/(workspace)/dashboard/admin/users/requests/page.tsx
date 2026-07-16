'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { PageTransition } from '@/components/motion';
import { LoadingState } from '@/components/states/loading-state';
import { apiFetch } from '@/lib/fetch';

type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

type Role = 'MANAGER' | 'EMPLOYEE' | 'CONTRACTOR' | 'CLIENT';
type VisibilityScope =
  | 'TENANT_WIDE'
  | 'WORKSPACE_LEVEL'
  | 'PROJECT_LEVEL'
  | 'CLIENT_LEVEL'
  | 'ASSIGNED_ITEMS_ONLY';

interface RegistrationRequest {
  id: string;
  fullName: string;
  phone: string | null;
  companyName: string | null;
  requestedRole: string;
  status: RequestStatus;
  adminNote: string | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    status: string;
  };
  reviewedBy: { email: string; displayName: string | null } | null;
}

const ROLE_LABELS: Record<Role, string> = {
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
  CONTRACTOR: 'Contractor',
  CLIENT: 'Client',
};

const SCOPE_LABELS: Record<VisibilityScope, string> = {
  TENANT_WIDE: 'Tenant-wide',
  WORKSPACE_LEVEL: 'Workspace level',
  PROJECT_LEVEL: 'Project level',
  CLIENT_LEVEL: 'Client level',
  ASSIGNED_ITEMS_ONLY: 'Assigned items only',
};

const STATUS_BADGE: Record<RequestStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};


export default function UserRequestsPage() {
  const reduced = useReducedMotion();
  const [tab, setTab] = useState<RequestStatus>('PENDING');
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Global action feedback (success)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Approve modal state
  const [approveTarget, setApproveTarget] = useState<RegistrationRequest | null>(null);
  const [approveRole, setApproveRole] = useState<Role>('EMPLOYEE');
  const [approveScope, setApproveScope] = useState<VisibilityScope>('ASSIGNED_ITEMS_ONLY');
  const [approveNote, setApproveNote] = useState('');
  const [approveLoading, setApproveLoading] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<RegistrationRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Change Role modal state
  const [changeRoleTarget, setChangeRoleTarget] = useState<RegistrationRequest | null>(null);
  const [changeRoleValue, setChangeRoleValue] = useState<Role>('EMPLOYEE');
  const [changeRoleLoading, setChangeRoleLoading] = useState(false);
  const [changeRoleError, setChangeRoleError] = useState<string | null>(null);

  // Per-row loading/error state for suspend/reactivate (keyed by userId)
  const [rowLoading, setRowLoading] = useState<Record<string, string | null>>({});
  const [rowError, setRowError] = useState<Record<string, string | null>>({});

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);
    setActionSuccess(null);
    setRowLoading({});
    setRowError({});
    try {
      setRequests(await apiFetch<RegistrationRequest[]>(`/admin/users/requests?status=${tab}`));
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : 'Failed to load requests.');
    } finally {
      setIsLoading(false);
    }
  }, [tab]);

  useEffect(() => { void fetchRequests(); }, [fetchRequests]);

  // ── PENDING: Approve ──────────────────────────────────────────────────────

  async function handleApprove() {
    if (!approveTarget) return;
    setApproveLoading(true);
    setApproveError(null);
    try {
      await apiFetch(`/admin/users/requests/${approveTarget.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({
          role: approveRole,
          visibilityScope: approveScope,
          adminNote: approveNote.trim() || undefined,
          permissions: [],
        }),
      });
      const approvedName = approveTarget.fullName;
      setApproveTarget(null);
      setApproveNote('');
      setActionSuccess(`${approvedName} has been approved. They can now log in.`);
      void fetchRequests();
    } catch (err: unknown) {
      setApproveError(err instanceof Error ? err.message : 'Approval failed.');
    } finally {
      setApproveLoading(false);
    }
  }

  // ── PENDING: Reject ───────────────────────────────────────────────────────

  async function handleReject() {
    if (!rejectTarget) return;
    setRejectLoading(true);
    setRejectError(null);
    try {
      await apiFetch(`/admin/users/requests/${rejectTarget.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejectionReason: rejectReason.trim() }),
      });
      setRejectTarget(null);
      setRejectReason('');
      void fetchRequests();
    } catch (err: unknown) {
      setRejectError(err instanceof Error ? err.message : 'Rejection failed.');
    } finally {
      setRejectLoading(false);
    }
  }

  // ── APPROVED: Change Role ─────────────────────────────────────────────────

  async function handleChangeRole() {
    if (!changeRoleTarget) return;
    setChangeRoleLoading(true);
    setChangeRoleError(null);
    try {
      await apiFetch(`/admin/users/${changeRoleTarget.user.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: changeRoleValue }),
      });
      const name = changeRoleTarget.fullName;
      setChangeRoleTarget(null);
      setActionSuccess(`Role updated to ${ROLE_LABELS[changeRoleValue]} for ${name}.`);
      void fetchRequests();
    } catch (err: unknown) {
      setChangeRoleError(err instanceof Error ? err.message : 'Role change failed.');
    } finally {
      setChangeRoleLoading(false);
    }
  }

  // ── APPROVED: Suspend ─────────────────────────────────────────────────────

  async function handleSuspend(req: RegistrationRequest) {
    setRowLoading((prev) => ({ ...prev, [req.user.id]: 'suspend' }));
    setRowError((prev) => ({ ...prev, [req.user.id]: null }));
    try {
      await apiFetch(`/admin/users/${req.user.id}/suspend`, {
        method: 'POST',
      });
      setActionSuccess(`${req.fullName} has been suspended.`);
      void fetchRequests();
    } catch (err: unknown) {
      setRowError((prev) => ({
        ...prev,
        [req.user.id]: err instanceof Error ? err.message : 'Suspend failed.',
      }));
    } finally {
      setRowLoading((prev) => ({ ...prev, [req.user.id]: null }));
    }
  }

  // ── APPROVED: Reactivate ──────────────────────────────────────────────────

  async function handleReactivate(req: RegistrationRequest) {
    setRowLoading((prev) => ({ ...prev, [req.user.id]: 'reactivate' }));
    setRowError((prev) => ({ ...prev, [req.user.id]: null }));
    try {
      await apiFetch(`/admin/users/${req.user.id}/reactivate`, {
        method: 'POST',
      });
      setActionSuccess(`${req.fullName} has been reactivated.`);
      void fetchRequests();
    } catch (err: unknown) {
      setRowError((prev) => ({
        ...prev,
        [req.user.id]: err instanceof Error ? err.message : 'Reactivate failed.',
      }));
    } finally {
      setRowLoading((prev) => ({ ...prev, [req.user.id]: null }));
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <PageTransition className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">User Access Requests</h1>
        <p className="mt-1 text-sm text-muted">
          Review and approve or reject registration requests from new users.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {(['PENDING', 'APPROVED', 'REJECTED'] as RequestStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`px-4 py-2 text-sm font-medium transition ${
              tab === s
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Success banner */}
      <AnimatePresence>
        {actionSuccess && (
          <motion.div
            key="action-success"
            className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800"
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <span>{actionSuccess}</span>
            <button
              onClick={() => setActionSuccess(null)}
              className="ml-4 text-green-600 hover:text-green-900"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {pageError && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {pageError}
        </div>
      )}

      {isLoading ? (
        <LoadingState />
      ) : requests.length === 0 ? (
        <p className="text-sm text-muted">No {tab.toLowerCase()} requests.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-foreground">Name</th>
                <th className="px-4 py-3 font-medium text-foreground">Email</th>
                <th className="px-4 py-3 font-medium text-foreground">Requested As</th>
                <th className="px-4 py-3 font-medium text-foreground">Company</th>
                <th className="px-4 py-3 font-medium text-foreground">Status</th>
                <th className="px-4 py-3 font-medium text-foreground">Submitted</th>
                {(tab === 'PENDING' || tab === 'APPROVED') && (
                  <th className="px-4 py-3 font-medium text-foreground">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {requests.map((req, i) => {
                const isSuspended = req.user.status === 'SUSPENDED';
                const thisRowLoading = rowLoading[req.user.id] ?? null;
                const thisRowError = rowError[req.user.id] ?? null;

                return (
                  <motion.tr
                    key={req.id}
                    className="bg-surface transition-colors hover:bg-muted/10"
                    initial={reduced ? false as const : { opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: reduced ? 0 : Math.min(i * 0.04, 0.3), ease: [0, 0, 0.2, 1] }}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{req.fullName}</td>
                    <td className="px-4 py-3 text-muted">{req.user.email}</td>
                    <td className="px-4 py-3 capitalize text-muted">
                      {req.requestedRole.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 text-muted">{req.companyName ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[req.status]}`}
                        >
                          {req.status.charAt(0) + req.status.slice(1).toLowerCase()}
                        </span>
                        {isSuspended && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            Suspended
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>

                    {/* PENDING actions */}
                    {tab === 'PENDING' && (
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <motion.button
                            onClick={() => {
                              setApproveTarget(req);
                              setApproveRole('EMPLOYEE');
                              setApproveScope('ASSIGNED_ITEMS_ONLY');
                              setApproveNote('');
                              setApproveError(null);
                            }}
                            className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                            whileHover={reduced ? undefined : { scale: 1.04 }}
                            whileTap={reduced ? undefined : { scale: 0.97 }}
                          >
                            Approve
                          </motion.button>
                          <motion.button
                            onClick={() => {
                              setRejectTarget(req);
                              setRejectReason('');
                              setRejectError(null);
                            }}
                            className="rounded bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/20"
                            whileHover={reduced ? undefined : { scale: 1.04 }}
                            whileTap={reduced ? undefined : { scale: 0.97 }}
                          >
                            Reject
                          </motion.button>
                        </div>
                      </td>
                    )}

                    {/* APPROVED actions */}
                    {tab === 'APPROVED' && (
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap gap-2">
                            {/* Change Role */}
                            <motion.button
                              onClick={() => {
                                setChangeRoleTarget(req);
                                setChangeRoleValue('EMPLOYEE');
                                setChangeRoleError(null);
                              }}
                              className="rounded bg-muted/50 px-3 py-1 text-xs font-medium text-foreground hover:bg-muted"
                              whileHover={reduced ? undefined : { scale: 1.04 }}
                              whileTap={reduced ? undefined : { scale: 0.97 }}
                            >
                              Change Role
                            </motion.button>

                            {/* Suspend (only if not already suspended) */}
                            {!isSuspended && (
                              <motion.button
                                onClick={() => void handleSuspend(req)}
                                disabled={thisRowLoading === 'suspend'}
                                className="rounded bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                                whileHover={reduced ? undefined : { scale: 1.04 }}
                                whileTap={reduced ? undefined : { scale: 0.97 }}
                              >
                                {thisRowLoading === 'suspend' ? (
                                  <span className="flex items-center gap-1.5">
                                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-amber-700 border-t-transparent" />
                                    Suspending…
                                  </span>
                                ) : 'Suspend'}
                              </motion.button>
                            )}

                            {/* Reactivate (only if suspended) */}
                            {isSuspended && (
                              <motion.button
                                onClick={() => void handleReactivate(req)}
                                disabled={thisRowLoading === 'reactivate'}
                                className="rounded bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                                whileHover={reduced ? undefined : { scale: 1.04 }}
                                whileTap={reduced ? undefined : { scale: 0.97 }}
                              >
                                {thisRowLoading === 'reactivate' ? (
                                  <span className="flex items-center gap-1.5">
                                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-green-700 border-t-transparent" />
                                    Reactivating…
                                  </span>
                                ) : 'Reactivate'}
                              </motion.button>
                            )}
                          </div>

                          {/* Row-level error */}
                          {thisRowError && (
                            <p className="text-xs text-destructive">{thisRowError}</p>
                          )}
                        </div>
                      </td>
                    )}
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Approve Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {approveTarget && (
          <motion.div
            key="approve-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50"
              onClick={() => setApproveTarget(null)}
            />
            <motion.div
              className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl"
              initial={reduced ? false as const : { opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 4 }}
              transition={{ duration: 0.22, ease: [0.34, 1.2, 0.64, 1] }}
            >
              <h2 className="mb-1 text-lg font-semibold text-foreground">Approve Request</h2>
              <p className="mb-4 text-sm text-muted">
                Approving <strong>{approveTarget.fullName}</strong> ({approveTarget.user.email})
              </p>

              <AnimatePresence>
                {approveError && (
                  <motion.div
                    key="approve-error"
                    className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
                    initial={{ opacity: 0, y: -4, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -4, height: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    {approveError}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Assign Role</label>
                  <select
                    value={approveRole}
                    onChange={(e) => setApproveRole(e.target.value as Role)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Visibility Scope
                  </label>
                  <select
                    value={approveScope}
                    onChange={(e) => setApproveScope(e.target.value as VisibilityScope)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {(Object.entries(SCOPE_LABELS) as [VisibilityScope, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted">
                    Controls which resources this user can see after login.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Admin Note <span className="text-xs text-muted">(optional)</span>
                  </label>
                  <textarea
                    value={approveNote}
                    onChange={(e) => setApproveNote(e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="Internal note visible only to admins"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setApproveTarget(null)}
                  className="rounded-lg px-4 py-2 text-sm text-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <motion.button
                  onClick={() => void handleApprove()}
                  disabled={approveLoading}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  whileHover={reduced ? undefined : { y: -1 }}
                  whileTap={reduced ? undefined : { scale: 0.97 }}
                >
                  {approveLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
                      Approving…
                    </span>
                  ) : 'Confirm Approval'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reject Modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {rejectTarget && (
          <motion.div
            key="reject-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50"
              onClick={() => setRejectTarget(null)}
            />
            <motion.div
              className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl"
              initial={reduced ? false as const : { opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 4 }}
              transition={{ duration: 0.22, ease: [0.34, 1.2, 0.64, 1] }}
            >
              <h2 className="mb-1 text-lg font-semibold text-foreground">Reject Request</h2>
              <p className="mb-4 text-sm text-muted">
                Rejecting <strong>{rejectTarget.fullName}</strong> ({rejectTarget.user.email})
              </p>

              <AnimatePresence>
                {rejectError && (
                  <motion.div
                    key="reject-error"
                    className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
                    initial={{ opacity: 0, y: -4, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -4, height: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    {rejectError}
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Rejection Reason <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  minLength={5}
                  maxLength={500}
                  required
                  placeholder="Explain why this request is being rejected…"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setRejectTarget(null)}
                  className="rounded-lg px-4 py-2 text-sm text-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <motion.button
                  onClick={() => void handleReject()}
                  disabled={rejectLoading || rejectReason.trim().length < 5}
                  className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white hover:bg-destructive/90 disabled:opacity-50"
                  whileHover={reduced ? undefined : { y: -1 }}
                  whileTap={reduced ? undefined : { scale: 0.97 }}
                >
                  {rejectLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
                      Rejecting…
                    </span>
                  ) : 'Confirm Rejection'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Change Role Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {changeRoleTarget && (
          <motion.div
            key="change-role-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50"
              onClick={() => setChangeRoleTarget(null)}
            />
            <motion.div
              className="relative w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl"
              initial={reduced ? false as const : { opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 4 }}
              transition={{ duration: 0.22, ease: [0.34, 1.2, 0.64, 1] }}
            >
              <h2 className="mb-1 text-lg font-semibold text-foreground">Change Role</h2>
              <p className="mb-4 text-sm text-muted">
                Updating role for <strong>{changeRoleTarget.fullName}</strong> (
                {changeRoleTarget.user.email})
              </p>

              <AnimatePresence>
                {changeRoleError && (
                  <motion.div
                    key="change-role-error"
                    className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
                    initial={{ opacity: 0, y: -4, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -4, height: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    {changeRoleError}
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">New Role</label>
                <select
                  value={changeRoleValue}
                  onChange={(e) => setChangeRoleValue(e.target.value as Role)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted">
                  Owner role cannot be assigned or changed here.
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setChangeRoleTarget(null)}
                  className="rounded-lg px-4 py-2 text-sm text-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <motion.button
                  onClick={() => void handleChangeRole()}
                  disabled={changeRoleLoading}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  whileHover={reduced ? undefined : { y: -1 }}
                  whileTap={reduced ? undefined : { scale: 0.97 }}
                >
                  {changeRoleLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
                      Updating…
                    </span>
                  ) : 'Confirm Change'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
