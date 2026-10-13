'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageTransition } from '@/components/motion';
import { OwnerFinanceKpis } from '@/components/dashboard/owner-finance-kpis';
import { getStoredUser, getStoredTenant, type StoredUser, type StoredTenant } from '@/lib/auth';
import { relativeTime } from '@/lib/activity';
import { itemHref, type CalendarItem } from '@/lib/calendar';
import { apiFetch } from '@/lib/fetch';
import { dueText, type MyWork } from '@/lib/my-work';
import {
  activeProjects,
  attention,
  canSeeFinance,
  nextTasks,
  upcoming,
  upcomingRange,
  type ProjectRow,
} from '@/lib/ops-dashboard';

/**
 * Operations-first dashboard (MAOS D7): what needs attention now, what comes
 * next, and where work stands. Every number comes from an API that already
 * scopes it to the viewer (contractors see their assigned work only); a
 * section whose data could not be loaded says so instead of showing zeros.
 */

type WorkspaceSummary = {
  projectTasks: { projects: number; tasks: number };
  crm: { leads: number; opportunities: number; meetings: number; pendingFollowUps: number };
  collaboration: { notes: number; files: number; pendingApprovals: number };
  voiceNotes: number;
  invoices: number;
};

type Loaded<T> = T | 'loading' | 'error';

const roleLabels: Record<string, string> = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
  CONTRACTOR: 'Contractor',
  CLIENT: 'Client',
};

function SectionTitle({ children, href, linkLabel }: { children: React.ReactNode; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{children}</h2>
      {href && (
        <Link href={href} className="text-xs font-medium text-accent hover:underline">
          {linkLabel ?? 'View all →'}
        </Link>
      )}
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-line bg-panel p-4 shadow-card">{children}</div>;
}

function Placeholder<T>({ state, empty }: { state: Loaded<T>; empty: string }) {
  if (state === 'loading') return <div className="h-16 animate-pulse rounded-xl bg-slate-100" />;
  if (state === 'error') return <p className="text-sm text-slate-500">Could not load this section.</p>;
  return <p className="text-sm text-slate-500">{empty}</p>;
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-2xl border border-line bg-panel p-4 shadow-card transition hover:-translate-y-0.5 hover:bg-slate-50"
    >
      <span className="text-xl font-bold tabular-nums text-ink">{value}</span>
      <span className="text-xs font-medium text-slate-500">{label}</span>
    </Link>
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [tenant, setTenant] = useState<StoredTenant | null>(null);
  const [work, setWork] = useState<Loaded<MyWork>>('loading');
  const [calendar, setCalendar] = useState<Loaded<CalendarItem[]>>('loading');
  const [projects, setProjects] = useState<Loaded<ProjectRow[]>>('loading');
  const [summary, setSummary] = useState<Loaded<WorkspaceSummary>>('loading');
  const [pendingUsers, setPendingUsers] = useState<number | null>(null);
  const [now] = useState(() => new Date());
  const [showFinance, setShowFinance] = useState(false);

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);
    setTenant(getStoredTenant());

    apiFetch<MyWork>('/my-work').then(setWork).catch(() => setWork('error'));
    const { from, to } = upcomingRange(now);
    apiFetch<{ items: CalendarItem[] }>(`/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then((r) => setCalendar(r.items))
      .catch(() => setCalendar('error'));
    apiFetch<ProjectRow[]>('/projects').then(setProjects).catch(() => setProjects('error'));
    apiFetch<WorkspaceSummary>('/dashboards/workspace-summary').then(setSummary).catch(() => setSummary('error'));

    if (canSeeFinance(u?.role)) {
      setShowFinance(true);
    }
    if (u?.role === 'OWNER') {
      apiFetch<unknown[]>('/admin/users/requests?status=PENDING')
        .then((rows) => setPendingUsers(Array.isArray(rows) ? rows.length : null))
        .catch(() => setPendingUsers(null));
    }
  }, [now]);

  const tasks = typeof work === 'object' ? nextTasks(work) : [];
  const toDecide = typeof work === 'object' ? work.approvals.toDecide.slice(0, 5) : [];
  const latest = typeof work === 'object' ? work.notifications.latest.slice(0, 5) : [];
  const soon = Array.isArray(calendar) ? upcoming(calendar, now) : [];
  const active = Array.isArray(projects) ? activeProjects(projects) : { shown: [], total: 0 };

  return (
    <PageTransition className="space-y-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Today</p>
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

      {/* Needs attention */}
      <section>
        <SectionTitle href="/my-work" linkLabel="Open My Work →">Needs attention</SectionTitle>
        {typeof work === 'object' ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {attention(work).map((a) => (
              <Link
                key={a.key}
                href={a.href}
                className={`flex flex-col gap-1 rounded-2xl border p-5 shadow-card transition hover:-translate-y-0.5 ${
                  a.urgent && a.count > 0 ? 'border-amber-200 bg-amber-50' : 'border-line bg-panel hover:bg-slate-50'
                }`}
              >
                <span className={`text-2xl font-bold tabular-nums ${a.urgent && a.count > 0 ? 'text-amber-700' : 'text-ink'}`}>
                  {a.count}
                </span>
                <span className="text-xs font-medium text-slate-500">{a.label}</span>
              </Link>
            ))}
          </div>
        ) : (
          <Placeholder state={work} empty="" />
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionTitle href="/my-work">My next tasks</SectionTitle>
          <Panel>
            {tasks.length > 0 ? (
              <ul className="divide-y divide-line">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                    <Link href={`/tasks/${t.id}`} className="min-w-0 truncate text-sm font-medium text-ink hover:underline">
                      {t.title}
                      {t.project && <span className="ml-2 text-xs font-normal text-slate-500">{t.project.name}</span>}
                    </Link>
                    <span className="shrink-0 text-xs text-slate-500">{dueText(t.dueAt, now)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Placeholder state={work} empty="Nothing overdue or due soon." />
            )}
          </Panel>
        </section>

        <section>
          <SectionTitle href="/calendar">Next 7 days</SectionTitle>
          <Panel>
            {soon.length > 0 ? (
              <ul className="divide-y divide-line">
                {soon.map((i) => (
                  <li key={`${i.type}-${i.id}`} className="flex items-center justify-between gap-3 py-2">
                    <Link href={itemHref(i)} className="min-w-0 truncate text-sm text-ink hover:underline">
                      {i.title}
                    </Link>
                    <span className="shrink-0 text-xs text-slate-500">
                      {new Date(i.at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <Placeholder state={calendar} empty="Nothing scheduled in the next 7 days." />
            )}
          </Panel>
        </section>

        <section>
          <SectionTitle href="/approvals">Approvals waiting for you</SectionTitle>
          <Panel>
            {toDecide.length > 0 ? (
              <ul className="divide-y divide-line">
                {toDecide.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                    <Link href={`/approvals/${a.id}`} className="min-w-0 truncate text-sm text-ink hover:underline">
                      {a.title}
                    </Link>
                    <span className="shrink-0 text-xs text-slate-500">{dueText(a.dueAt, now)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Placeholder state={work} empty="No approvals waiting for you." />
            )}
          </Panel>
        </section>

        <section>
          <SectionTitle href="/notifications">Recent activity</SectionTitle>
          <Panel>
            {latest.length > 0 ? (
              <ul className="divide-y divide-line">
                {latest.map((n) => (
                  <li key={n.id} className="flex items-center justify-between gap-3 py-2">
                    <span className={`min-w-0 truncate text-sm ${n.status === 'UNREAD' ? 'font-medium text-ink' : 'text-slate-600'}`}>
                      {n.title}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">{relativeTime(n.createdAt, now)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Placeholder state={work} empty="No recent activity." />
            )}
          </Panel>
        </section>
      </div>

      <section>
        <SectionTitle href="/projects">
          Active projects{Array.isArray(projects) && active.total > 0 ? ` (${active.total})` : ''}
        </SectionTitle>
        {active.shown.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.shown.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="rounded-2xl border border-line bg-panel p-4 shadow-card transition hover:-translate-y-0.5 hover:bg-slate-50"
              >
                <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {p._count ? `${p._count.tasks} task${p._count.tasks === 1 ? '' : 's'} · ` : ''}
                  updated {relativeTime(p.updatedAt, now)}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <Panel>
            <Placeholder state={projects} empty="No active projects." />
          </Panel>
        )}
      </section>

      {showFinance && <OwnerFinanceKpis />}

      <section>
        <SectionTitle>Workspace at a glance</SectionTitle>
        {typeof summary === 'object' ? (
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Leads" value={summary.crm.leads} href="/crm/leads" />
            <StatCard label="Opportunities" value={summary.crm.opportunities} href="/crm/opportunities" />
            <StatCard label="Pending follow-ups" value={summary.crm.pendingFollowUps} href="/crm/follow-ups" />
            <StatCard label="Pending approvals" value={summary.collaboration.pendingApprovals} href="/approvals" />
            <StatCard label="Files" value={summary.collaboration.files} href="/files" />
            <StatCard label="Invoices" value={summary.invoices} href="/finance/invoices" />
          </div>
        ) : (
          <Placeholder state={summary} empty="" />
        )}
      </section>

      {user?.role === 'OWNER' && (
        <section>
          <SectionTitle>Administration</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/dashboard/admin/users/requests"
              className="flex items-start justify-between gap-4 rounded-2xl border border-line bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:bg-slate-50"
            >
              <div>
                <p className="text-base font-semibold text-ink">User access requests</p>
                <p className="mt-1 text-sm text-slate-600">Approve, reject or suspend registration requests.</p>
              </div>
              {pendingUsers !== null && (
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-semibold ${
                    pendingUsers > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {pendingUsers > 0 ? `${pendingUsers} pending` : 'None pending'}
                </span>
              )}
            </Link>
            <Link
              href="/dashboard/admin/invites"
              className="rounded-2xl border border-line bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:bg-slate-50"
            >
              <p className="text-base font-semibold text-ink">Invitations</p>
              <p className="mt-1 text-sm text-slate-600">Invite team members by email.</p>
            </Link>
          </div>
        </section>
      )}
    </PageTransition>
  );
}
