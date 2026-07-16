'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageTransition } from '@/components/motion';
import { getStoredUser, getStoredTenant, getAccessToken, type StoredUser, type StoredTenant } from '@/lib/auth';
import { apiBase } from '@/lib/api';
import { apiFetch } from '@/lib/fetch';

type WorkspaceSummary = {
  projectTasks: { projects: number; tasks: number };
  crm: { leads: number; opportunities: number; meetings: number; pendingFollowUps: number };
  collaboration: { notes: number; files: number; pendingApprovals: number };
  voiceNotes: number;
  invoices: number;
};

type UnreadCount = { count: number };

const roleLabels: Record<string, string> = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
  CONTRACTOR: 'Contractor',
  CLIENT: 'Client',
};

function StatCard({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: number | string;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col gap-1 rounded-2xl border p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-md ${
        highlight && Number(value) > 0
          ? 'border-amber-200 bg-amber-50 hover:border-amber-300'
          : 'border-line bg-panel hover:border-accent/40 hover:bg-slate-50'
      }`}
    >
      <span
        className={`text-2xl font-bold tabular-nums ${
          highlight && Number(value) > 0 ? 'text-amber-700' : 'text-ink'
        }`}
      >
        {value}
      </span>
      <span className="text-xs font-medium text-slate-500">{label}</span>
    </Link>
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [tenant, setTenant] = useState<StoredTenant | null>(null);
  const [summary, setSummary] = useState<WorkspaceSummary | null>(null);
  const [unread, setUnread] = useState<number>(0);
  const [pendingUsers, setPendingUsers] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getStoredUser();
    const t = getStoredTenant();
    setUser(u);
    setTenant(t);

    const fetches: Promise<void>[] = [
      apiFetch<WorkspaceSummary>('/dashboards/workspace-summary')
        .then(setSummary)
        .catch(() => {}),
      apiFetch<UnreadCount>('/notifications/unread-count')
        .then((d) => setUnread(d.count))
        .catch(() => {}),
    ];

    // OWNER only: pending user count
    if (u?.role === 'OWNER') {
      const token = getAccessToken();
      if (token) {
        fetches.push(
          fetch(`${apiBase()}/admin/users/requests?status=PENDING`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((data: unknown) => {
              if (Array.isArray(data)) {
                setPendingUsers(data.length);
              } else if (
                data &&
                typeof data === 'object' &&
                'requests' in data &&
                Array.isArray((data as { requests: unknown[] }).requests)
              ) {
                setPendingUsers((data as { requests: unknown[] }).requests.length);
              } else {
                setPendingUsers(0);
              }
            })
            .catch(() => setPendingUsers(0)),
        );
      }
    }

    Promise.allSettled(fetches).finally(() => setLoading(false));
  }, []);

  return (
    <PageTransition className="space-y-8">
      {/* Welcome header */}
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Workspace</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          {user ? `Welcome back, ${user.displayName}` : 'Dashboard'}
        </h1>
        {tenant && (
          <p className="mt-2 text-sm text-slate-500">
            {tenant.name}
            {user?.role && (
              <span className="ml-2 inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                {roleLabels[user.role] ?? user.role}
              </span>
            )}
          </p>
        )}
      </section>

      {/* OWNER — User Access Requests panel */}
      {user?.role === 'OWNER' && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Administration
          </h2>
          <Link
            href="/dashboard/admin/users/requests"
            className="flex items-start justify-between gap-4 rounded-2xl border border-line bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-accent/40 hover:bg-slate-50"
          >
            <div>
              <p className="text-base font-semibold text-ink">User Access Requests</p>
              <p className="mt-1 text-sm text-slate-600">
                Approve, reject, or suspend registration requests for this workspace.
              </p>
            </div>
            <div className="shrink-0 text-right">
              {pendingUsers !== null && (
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold ${
                    pendingUsers > 0
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {pendingUsers > 0 ? `${pendingUsers} pending` : 'No pending requests'}
                </span>
              )}
              <p className="mt-2 text-xs font-medium text-accent">Review →</p>
            </div>
          </Link>
        </section>
      )}

      {/* Workspace summary */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Workspace overview
        </h2>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl border border-line bg-slate-100"
              />
            ))}
          </div>
        ) : summary ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Projects" value={summary.projectTasks.projects} href="/projects" />
            <StatCard label="Tasks" value={summary.projectTasks.tasks} href="/tasks" />
            <StatCard label="Leads" value={summary.crm.leads} href="/crm/leads" />
            <StatCard label="Opportunities" value={summary.crm.opportunities} href="/crm/opportunities" />
            <StatCard
              label="Pending approvals"
              value={summary.collaboration.pendingApprovals}
              href="/approvals"
              highlight
            />
            <StatCard
              label="Pending follow-ups"
              value={summary.crm.pendingFollowUps}
              href="/crm"
              highlight
            />
            <StatCard label="Files" value={summary.collaboration.files} href="/files" />
            <StatCard label="Voice notes" value={summary.voiceNotes} href="/voice" />
            <StatCard
              label="Unread notifications"
              value={unread}
              href="/notifications"
              highlight
            />
            <StatCard label="Invoices" value={summary.invoices} href="/finance/invoices" />
            <StatCard label="Meetings" value={summary.crm.meetings} href="/crm/meetings" />
            <StatCard label="Internal notes" value={summary.collaboration.notes} href="/collaboration" />
          </div>
        ) : (
          <p className="text-sm text-slate-500">Could not load workspace summary.</p>
        )}
      </section>
    </PageTransition>
  );
}
