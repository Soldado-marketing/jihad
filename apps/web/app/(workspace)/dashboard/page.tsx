'use client';

import { useEffect, useMemo, useState } from 'react';
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
  canSeeFinance,
  nextTasks,
  upcoming,
  upcomingRange,
  type ProjectRow,
} from '@/lib/ops-dashboard';
import { workspaceNavigation } from '@/navigation/navigation';
import type { WorkspaceRole } from '@/navigation/roles';
import { filterNavigationItems } from '@/security/ui-permissions';

/**
 * PROPOSAL (not merged): the operations dashboard with the same data sources
 * as today (/my-work, /calendar, /projects, /dashboards/workspace-summary,
 * and the OWNER finance widget) plus /tasks for OWNER and MANAGER, which the
 * API already scopes to the viewer. Personal numbers say "your"; team numbers
 * use the same rules as My Work (blocked is not counted as overdue).
 * A link or card is shown only when the role may open its page: the same
 * navigation rules as the sidebar decide (no link to a refusal page).
 */

type WorkspaceSummary = {
  projectTasks: { projects: number; tasks: number };
  crm: { leads: number; opportunities: number; meetings: number; pendingFollowUps: number };
  collaboration: { notes: number; files: number; pendingApprovals: number };
  voiceNotes: number;
  invoices: number;
};

type TeamTask = {
  id: string;
  title: string;
  status: string;
  dueAt: string | null;
  assignedTo: { displayName: string | null; email: string } | null;
  project: { id: string; name: string } | null;
};

type Loaded<T> = T | 'loading' | 'error';

const roleLabels: Record<string, string> = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
  CONTRACTOR: 'Contractor',
  CLIENT: 'Client',
};

const CLOSED = new Set(['DONE', 'ARCHIVED']);
const DAY_MS = 86_400_000;

function teamView(tasks: readonly TeamTask[], now: Date) {
  const open = tasks.filter((t) => !CLOSED.has(t.status));
  const blocked = open.filter((t) => t.status === 'BLOCKED');
  const overdue = open
    .filter((t) => t.status !== 'BLOCKED' && t.dueAt && Date.parse(t.dueAt) < now.getTime())
    .sort((a, b) => Date.parse(a.dueAt as string) - Date.parse(b.dueAt as string));
  return { open: open.length, blocked, overdue, rows: [...blocked, ...overdue].slice(0, 6) };
}

function daysLate(dueAt: string | null, now: Date) {
  if (!dueAt) return null;
  const d = Math.floor((now.getTime() - Date.parse(dueAt)) / DAY_MS);
  return d > 0 ? d : null;
}

function Section({ title, href, linkLabel, children }: { title: string; href?: string; linkLabel?: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-line bg-panel p-4 shadow-card sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {href && (
          <Link href={href} className="shrink-0 text-sm font-medium text-accent hover:underline">
            {linkLabel ?? 'View all'}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Placeholder<T>({ state, empty }: { state: Loaded<T>; empty: string }) {
  if (state === 'loading') return <div className="h-16 animate-pulse rounded-xl bg-slate-100" />;
  if (state === 'error') return <p className="text-sm text-slate-500">Could not load this section.</p>;
  return <p className="text-sm text-slate-500">{empty}</p>;
}

/** An action count: tone shows whether it needs someone now. */
function ActionCard({ label, count, href, cta, tone }: { label: string; count: number; href: string; cta: string; tone: 'critical' | 'waiting' | 'calm' }) {
  const active = count > 0;
  const bar = !active ? 'border-s-line' : tone === 'critical' ? 'border-s-signal' : tone === 'waiting' ? 'border-s-flame' : 'border-s-sky';
  return (
    <Link
      href={href}
      className={`flex flex-col gap-1 rounded-2xl border border-line border-s-4 ${bar} bg-panel p-4 shadow-card transition hover:bg-slate-50`}
    >
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <span className="text-3xl font-bold tabular-nums tracking-tight text-ink">{count}</span>
      <span className={`text-sm font-semibold ${active ? 'text-accent' : 'text-slate-400'}`}>{active ? cta : 'Nothing to do'}</span>
    </Link>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return <ul className="divide-y divide-line">{children}</ul>;
}

export default function DashboardPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [tenant, setTenant] = useState<StoredTenant | null>(null);
  const [work, setWork] = useState<Loaded<MyWork>>('loading');
  const [calendar, setCalendar] = useState<Loaded<CalendarItem[]>>('loading');
  const [projects, setProjects] = useState<Loaded<ProjectRow[]>>('loading');
  const [summary, setSummary] = useState<Loaded<WorkspaceSummary>>('loading');
  const [team, setTeam] = useState<Loaded<TeamTask[]> | null>(null);
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

    // Team view only for roles that manage work; the API scopes /tasks anyway.
    if (u?.role === 'OWNER' || u?.role === 'MANAGER') {
      setTeam('loading');
      apiFetch<TeamTask[]>('/tasks').then(setTeam).catch(() => setTeam('error'));
    }
    if (canSeeFinance(u?.role)) {
      setShowFinance(true);
    }
    if (u?.role === 'OWNER') {
      apiFetch<unknown[]>('/admin/users/requests?status=PENDING')
        .then((rows) => setPendingUsers(Array.isArray(rows) ? rows.length : null))
        .catch(() => setPendingUsers(null));
    }
  }, [now]);

  const allowed = useMemo(
    () => new Set(user?.role ? filterNavigationItems(user.role as WorkspaceRole, workspaceNavigation).map((i) => i.id) : []),
    [user?.role],
  );
  const can = (id: string) => allowed.has(id);
  const mine = typeof work === 'object' ? work : null;
  const tasks = mine ? nextTasks(mine) : [];
  const toDecide = mine ? mine.approvals.toDecide.slice(0, 5) : [];
  const latest = mine ? mine.notifications.latest.slice(0, 5) : [];
  const soon = Array.isArray(calendar) ? upcoming(calendar, now) : [];
  const active = Array.isArray(projects) ? activeProjects(projects) : { shown: [], total: 0 };
  const teamData = Array.isArray(team) ? teamView(team, now) : null;
  const today = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <PageTransition className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-slate-600">
            {today}
            {tenant ? ` · ${tenant.name}` : ''}
            {user?.role ? ` · ${roleLabels[user.role] ?? user.role}` : ''}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {user ? `Good to see you, ${user.displayName}` : 'Dashboard'}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href="/tasks" className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-slate-50">
            Task board
          </Link>
          <Link href="/my-work" className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:opacity-90">
            Open My Work
          </Link>
        </div>
      </section>

      {/* What you have to do (personal, from My Work) */}
      <section aria-labelledby="mine-heading">
        <h2 id="mine-heading" className="mb-3 text-base font-semibold text-ink">Needs your action</h2>
        {mine ? (
          <div className={`grid grid-cols-2 gap-3 ${can('approvals') ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
            {can('approvals') && (
              <ActionCard label="Approvals for you to decide" count={mine.approvals.toDecide.length} href="/approvals" cta="Decide now" tone="critical" />
            )}
            <ActionCard label="Your overdue tasks" count={mine.tasks.overdue.length} href="/my-work" cta="Catch up" tone="critical" />
            <ActionCard label="Your blocked tasks" count={mine.tasks.blocked.length} href="/my-work" cta="Unblock" tone="waiting" />
            <ActionCard label="Your tasks due in 7 days" count={mine.tasks.dueSoon.length} href="/my-work" cta="Plan them" tone="calm" />
          </div>
        ) : (
          <Placeholder state={work} empty="" />
        )}
      </section>

      {/* Team (OWNER, MANAGER): where work is stuck, from /tasks */}
      {team !== null && (
        <Section title="Team · blocked and overdue" href="/tasks?status=BLOCKED" linkLabel="Open blocked on the board">
          {teamData ? (
            <>
              <p className="mb-3 text-sm text-slate-600">
                <span className="font-semibold text-ink">{teamData.blocked.length}</span> blocked ·{' '}
                <span className="font-semibold text-ink">{teamData.overdue.length}</span> overdue · {teamData.open} open tasks in this company
              </p>
              {teamData.rows.length > 0 ? (
                <List>
                  {teamData.rows.map((t) => {
                    const late = daysLate(t.dueAt, now);
                    return (
                      <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.status === 'BLOCKED' ? 'bg-flame-soft text-warning' : 'bg-signal-soft text-danger'}`}
                        >
                          {t.status === 'BLOCKED' ? 'Blocked' : `${late ?? 0} d late`}
                        </span>
                        <Link href={`/tasks/${t.id}`} className="min-w-0 flex-1 truncate text-sm font-medium text-ink hover:underline">
                          {t.title}
                        </Link>
                        <span className="text-xs text-slate-600">
                          {t.assignedTo ? (t.assignedTo.displayName ?? t.assignedTo.email) : 'Unassigned'}
                          {t.project ? ` · ${t.project.name}` : ''}
                        </span>
                      </li>
                    );
                  })}
                </List>
              ) : (
                <p className="text-sm text-slate-500">Nothing blocked or overdue in the team.</p>
              )}
            </>
          ) : (
            <Placeholder state={team} empty="" />
          )}
        </Section>
      )}

      {showFinance && <OwnerFinanceKpis />}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Your next tasks" href="/my-work">
          {tasks.length > 0 ? (
            <List>
              {tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/tasks/${t.id}`} className="min-w-0 truncate text-sm font-medium text-ink hover:underline">
                    {t.title}
                    {t.project && <span className="ms-2 text-xs font-normal text-slate-500">{t.project.name}</span>}
                  </Link>
                  <span className="shrink-0 text-xs text-slate-600">{dueText(t.dueAt, now)}</span>
                </li>
              ))}
            </List>
          ) : (
            <Placeholder state={work} empty="Nothing overdue or due in the next 7 days." />
          )}
        </Section>

        <Section title="Next 7 days" href="/calendar">
          {soon.length > 0 ? (
            <List>
              {soon.map((i) => (
                <li key={`${i.type}-${i.id}`} className="flex items-center justify-between gap-3 py-2">
                  <Link href={itemHref(i)} className="min-w-0 truncate text-sm text-ink hover:underline">
                    {i.title}
                  </Link>
                  <span className="shrink-0 text-xs text-slate-600">
                    {new Date(i.at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                </li>
              ))}
            </List>
          ) : (
            <Placeholder state={calendar} empty="Nothing scheduled in the next 7 days." />
          )}
        </Section>
      </div>

      <Section title={`Active projects${Array.isArray(projects) && active.total > 0 ? ` (${active.total})` : ''}`} href="/projects">
        {active.shown.length > 0 ? (
          <List>
            {active.shown.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                <Link href={`/projects/${p.id}`} className="min-w-0 truncate text-sm font-semibold text-ink hover:underline">
                  {p.name}
                </Link>
                <span className="shrink-0 text-xs text-slate-600">
                  {p._count ? `${p._count.tasks} task${p._count.tasks === 1 ? '' : 's'} · ` : ''}updated {relativeTime(p.updatedAt, now)}
                </span>
              </li>
            ))}
          </List>
        ) : (
          <Placeholder state={projects} empty="No active projects." />
        )}
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        {can('approvals') && (
        <Section title="Approvals for you" href="/approvals">
          {toDecide.length > 0 ? (
            <List>
              {toDecide.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/approvals/${a.id}`} className="min-w-0 truncate text-sm text-ink hover:underline">
                    {a.title}
                  </Link>
                  <span className="shrink-0 text-xs text-slate-600">{dueText(a.dueAt, now)}</span>
                </li>
              ))}
            </List>
          ) : (
            <Placeholder state={work} empty="No approvals waiting for you." />
          )}
        </Section>
        )}

        <Section title="Recent activity" href={can('notifications') ? '/notifications' : undefined}>
          {latest.length > 0 ? (
            <List>
              {latest.map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-3 py-2">
                  <span className={`min-w-0 truncate text-sm ${n.status === 'UNREAD' ? 'font-medium text-ink' : 'text-slate-600'}`}>{n.title}</span>
                  <span className="shrink-0 text-xs text-slate-600">{relativeTime(n.createdAt, now)}</span>
                </li>
              ))}
            </List>
          ) : (
            <Placeholder state={work} empty="No recent activity." />
          )}
        </Section>
      </div>

      {typeof summary === 'object' && (
        <nav aria-label="Workspace records" className="flex flex-wrap gap-2 text-sm">
          {(
            [
              ['Leads', summary.crm.leads, '/crm/leads', 'crm'],
              ['Opportunities', summary.crm.opportunities, '/crm/opportunities', 'crm'],
              ['Follow-ups due', summary.crm.pendingFollowUps, '/crm/follow-ups', 'crm'],
              ['Files', summary.collaboration.files, '/files', 'files'],
              ['Invoices', summary.invoices, '/finance/invoices', 'finance'],
            ] as const
          ).filter(([, , , nav]) => can(nav)).map(([label, value, href]) => (
            <Link key={href} href={href} className="rounded-full border border-line bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50">
              {label} <span className="font-semibold text-ink tabular-nums">{value}</span>
            </Link>
          ))}
          {user?.role === 'OWNER' && (
            <>
              <Link href="/dashboard/admin/users/requests" className="rounded-full border border-line bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50">
                Access requests <span className="font-semibold text-ink">{pendingUsers ?? '–'}</span>
              </Link>
              <Link href="/dashboard/admin/invites" className="rounded-full border border-line bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50">
                Invite people
              </Link>
            </>
          )}
        </nav>
      )}
    </PageTransition>
  );
}
