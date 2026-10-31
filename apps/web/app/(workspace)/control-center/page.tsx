'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PageTransition } from '@/components/motion';
import { DeniedState } from '@/components/states/denied-state';
import { ErrorState } from '@/components/states/error-state';
import { getStoredTenant, getStoredUser } from '@/lib/auth';
import { openInCompany } from '@/lib/company-switch';
import { apiFetch } from '@/lib/fetch';
import { formatCents } from '@/lib/money';

/**
 * MAOS Control Center (OWNER): one overview of every company the user owns,
 * from GET /dashboards/control-center. The server authorizes each company and
 * scopes every query to it; this page never sends a company id to read data.
 * Viewing does not change the active company. Opening a record in another
 * company switches this user's session through /auth/companies/switch and
 * reloads the page; in the active company it is a normal navigation.
 */

type Money = { currency: string; openCents: number; invoices: number };
type CompanySummary = {
  id: string;
  name: string;
  slug: string;
  isCurrent: boolean;
  counts: {
    activeProjects: number;
    overdueTasks: number;
    blockedTasks: number;
    inReviewTasks: number;
    unassignedOpen: number;
    assignedOpen: number;
    approvalsInternal: number;
    approvalsClient: number;
  };
  finance: { outstanding: Money[]; overdue: Money[]; draftInvoices: number } | null;
};
type InCompany = { tenantId: string; companyName: string; href: string };
type AttentionItem = InCompany & {
  kind: 'approval' | 'blocked' | 'overdue';
  id: string;
  title: string;
  project: { id: string; name: string } | null;
  responsible: string | null;
  reason: string;
  dueAt: string | null;
  since: string | null;
};
type ProjectItem = InCompany & {
  id: string;
  name: string;
  owner: string | null;
  deadline: string | null;
  deadlinePassed: boolean;
  overdueTasks: number;
  blockedTasks: number;
};
type InvoiceItem = InCompany & {
  id: string;
  invoiceNumber: string;
  currency: string;
  openCents: number;
  dueAt: string | null;
  customer: string | null;
};
type ActivityItem = InCompany & {
  kind: 'task_done' | 'approval_decided' | 'approval_requested';
  title: string;
  by: string | null;
  decision?: string;
  at: string;
};
type Overview = {
  generatedAt: string;
  currentTenantId: string;
  companies: CompanySummary[];
  attention: AttentionItem[];
  projects: ProjectItem[];
  overdueAssignees: { tenantId: string; companyName: string; name: string | null; overdue: number }[];
  overdueInvoices: InvoiceItem[];
  activity: ActivityItem[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const days = (from: string, to: Date) => Math.max(0, Math.floor((to.getTime() - Date.parse(from)) / DAY_MS));
const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const KIND_LABEL = { approval: 'Approval', blocked: 'Blocked', overdue: 'Overdue' } as const;
const KIND_TONE = { approval: 'border-s-flame', blocked: 'border-s-signal', overdue: 'border-s-signal' } as const;
const DECISION_LABEL: Record<string, string> = {
  APPROVE: 'approved', REJECT: 'rejected', REQUEST_CHANGES: 'changes requested', CANCEL: 'canceled',
};

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-line bg-panel p-4 shadow-card sm:p-5">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function CompanyTag({ name }: { name: string }) {
  return <span className="inline-block max-w-full truncate rounded-full bg-sky-soft px-2 py-0.5 text-[11px] font-semibold text-navy">{name}</span>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

export default function ControlCenterPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);
  const [openError, setOpenError] = useState('');
  const [now, setNow] = useState(() => new Date());
  const request = useRef(0);

  const load = useCallback(async () => {
    const id = ++request.current;
    const tenantAtStart = getStoredTenant()?.id;
    setLoading(true);
    setError('');
    try {
      const overview = await apiFetch<Overview>('/dashboards/control-center');
      // Drop a response that belongs to an older request or to a session that
      // switched company while it was loading (for example in another tab).
      if (id !== request.current || getStoredTenant()?.id !== tenantAtStart) return;
      setData(overview);
      setNow(new Date(overview.generatedAt));
    } catch (e) {
      if (id !== request.current) return;
      setData(null);
      setError(e instanceof Error ? e.message : 'Could not load the Control Center.');
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const u = getStoredUser();
    setRole(u?.role ?? null);
    if (u?.role === 'OWNER') void load();
    else setLoading(false);
  }, [load]);

  async function open(item: { tenantId: string; href: string }, key: string) {
    if (!data || opening) return;
    setOpening(key);
    setOpenError('');
    try {
      // The live session decides which company is active, not the loaded snapshot.
      await openInCompany(item.tenantId, getStoredTenant()?.id ?? data.currentTenantId, item.href, (href) => router.push(href));
    } catch {
      setOpenError('This company or record is no longer available to you. The overview was refreshed.');
      setOpening(null);
      void load();
    }
  }

  // A real link (keyboard, middle click, screen readers) that switches company first when needed.
  function RecordLink({ item, label, k, className }: { item: InCompany; label: string; k: string; className?: string }) {
    return (
      <a
        href={item.href}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          void open(item, k);
        }}
        aria-busy={opening === k}
        className={className ?? 'block truncate text-sm font-medium text-ink hover:underline'}
      >
        {opening === k ? 'Opening…' : label}
      </a>
    );
  }

  if (role !== null && role !== 'OWNER') {
    return <DeniedState title="All my companies" description="The Control Center is available to company owners only." />;
  }

  const current = data?.companies.find((c) => c.isCurrent);
  const multi = (data?.companies.length ?? 0) > 1;

  return (
    <PageTransition className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Control Center</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">All my companies</h1>
          <p className="mt-1 text-sm text-slate-600">
            {data
              ? `${data.companies.length} ${data.companies.length === 1 ? 'company' : 'companies'} you own. Viewing does not change your active company${current ? ` (${current.name})` : ''}.`
              : 'Every company you own, in one place.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </header>

      {openError && <p role="alert" className="rounded-xl border border-danger/25 bg-danger/5 px-4 py-2 text-sm text-danger">{openError}</p>}
      {error && <ErrorState title="Could not load the Control Center" message={error} onRetry={() => void load()} />}
      {!data && loading && <div className="h-40 animate-pulse rounded-2xl bg-slate-100" aria-busy="true" aria-label="Loading" />}

      {data && (
        <>
          {/* 1 — Requires my attention */}
          <Section
            title="Requires my attention"
            description="Approvals waiting for an internal decision, blocked tasks and overdue tasks, most urgent first."
          >
            {data.attention.length === 0 ? (
              <Empty>Nothing needs your action right now.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {data.attention.map((a) => (
                  <li key={`${a.kind}-${a.id}`} className={`flex flex-col gap-1 border-s-4 ${KIND_TONE[a.kind]} py-3 ps-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4`}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <CompanyTag name={a.companyName} />
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{KIND_LABEL[a.kind]}</span>
                      </div>
                      <RecordLink item={a} label={a.title} k={`a-${a.id}`} className="mt-1 block truncate text-sm font-semibold text-ink hover:underline" />
                      <p className="text-xs text-slate-600">
                        {a.reason}
                        {a.project ? ` · ${a.project.name}` : ''}
                        {` · ${a.responsible ?? (a.kind === 'approval' ? 'Requester unknown' : 'No assignee')}`}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs tabular-nums text-slate-600">
                      {a.kind === 'overdue' && a.dueAt
                        ? `${days(a.dueAt, now)} d overdue`
                        : a.kind === 'blocked' && a.since
                          ? `No change for ${days(a.since, now)} d`
                          : a.since
                            ? `Waiting ${days(a.since, now)} d${a.dueAt ? ` · due ${date(a.dueAt)}` : ''}`
                            : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* 2 — My companies */}
          <Section title="My companies" description={multi ? 'Open a company to work inside it. Your session switches only when you open one.' : 'You own one company.'}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.companies.map((c) => (
                <article key={c.id} className={`min-w-0 rounded-xl border p-4 ${c.isCurrent ? 'border-sky bg-sky-soft/40' : 'border-line bg-white'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 truncate text-sm font-bold text-ink">{c.name}</h3>
                    {c.isCurrent && <span className="shrink-0 rounded-full bg-navy px-2 py-0.5 text-[11px] font-semibold text-white">Active company</span>}
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                    {([
                      ['Active projects', c.counts.activeProjects, false],
                      ['Overdue tasks', c.counts.overdueTasks, true],
                      ['Blocked', c.counts.blockedTasks, true],
                      ['Approvals waiting', c.counts.approvalsInternal, true],
                      ['In review', c.counts.inReviewTasks, false],
                      ['Waiting for client', c.counts.approvalsClient, false],
                    ] as const).map(([label, value, alert]) => (
                      <div key={label} className="min-w-0 rounded-lg bg-white/70 px-1 py-2">
                        <dt className="truncate text-[11px] text-slate-500">{label}</dt>
                        <dd className={`text-lg font-bold tabular-nums ${alert && value > 0 ? 'text-danger' : 'text-ink'}`}>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  {c.finance && (
                    <p className="mt-2 text-xs text-slate-600">
                      Open receivables:{' '}
                      {c.finance.outstanding.length
                        ? c.finance.outstanding.map((m) => formatCents(m.openCents, m.currency)).join(' · ')
                        : 'none'}
                    </p>
                  )}
                  <RecordLink
                    item={{ tenantId: c.id, companyName: c.name, href: '/dashboard' }}
                    label={c.isCurrent ? 'Go to dashboard' : 'Open company'}
                    k={`c-${c.id}`}
                    className="mt-3 inline-flex rounded-lg bg-navy px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
                  />
                </article>
              ))}
            </div>
          </Section>

          <div className="grid gap-6 xl:grid-cols-2">
            {/* 3 — Projects requiring attention */}
            <Section title="Projects requiring attention" description="Projects with overdue or blocked tasks, or a deadline within 14 days.">
              {data.projects.length === 0 ? (
                <Empty>No project needs attention.</Empty>
              ) : (
                <ul className="divide-y divide-line">
                  {data.projects.map((p) => (
                    <li key={p.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <div className="min-w-0">
                        <CompanyTag name={p.companyName} />
                        <RecordLink item={p} label={p.name} k={`p-${p.id}`} className="mt-1 block truncate text-sm font-semibold text-ink hover:underline" />
                        <p className="text-xs text-slate-600">{p.owner ? `Lead: ${p.owner}` : 'No project lead'}</p>
                      </div>
                      <p className="shrink-0 text-xs tabular-nums text-slate-600">
                        {[
                          p.overdueTasks ? `${p.overdueTasks} overdue` : null,
                          p.blockedTasks ? `${p.blockedTasks} blocked` : null,
                          p.deadline ? `${p.deadlinePassed ? 'Deadline passed' : 'Deadline'} ${date(p.deadline)}` : null,
                        ].filter(Boolean).join(' · ')}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {/* 4 — Team and responsibilities */}
            <Section title="Team and responsibilities" description="Counts of open work by who it is waiting for. Not a performance score.">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] text-start text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="py-1 pe-2 text-start font-semibold">Company</th>
                      <th className="px-2 py-1 text-end font-semibold">No assignee</th>
                      <th className="px-2 py-1 text-end font-semibold">With assignee</th>
                      <th className="px-2 py-1 text-end font-semibold">In review</th>
                      <th className="ps-2 py-1 text-end font-semibold">Client to decide</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.companies.map((c) => (
                      <tr key={c.id}>
                        <td className="max-w-[10rem] truncate py-2 pe-2 font-medium text-ink">{c.name}</td>
                        <td className={`px-2 py-2 text-end tabular-nums ${c.counts.unassignedOpen ? 'font-semibold text-danger' : ''}`}>{c.counts.unassignedOpen}</td>
                        <td className="px-2 py-2 text-end tabular-nums">{c.counts.assignedOpen}</td>
                        <td className="px-2 py-2 text-end tabular-nums">{c.counts.inReviewTasks}</td>
                        <td className="ps-2 py-2 text-end tabular-nums">{c.counts.approvalsClient}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                With assignee: To do or In progress. In review: waiting for a reviewer. Client to decide: approvals shared with the client.
              </p>
              {data.overdueAssignees.length > 0 && (
                <div className="mt-3">
                  <h3 className="text-xs font-semibold text-slate-600">Most overdue assignments</h3>
                  <ul className="mt-1 space-y-1 text-sm">
                    {data.overdueAssignees.map((p) => (
                      <li key={`${p.tenantId}-${p.name}`} className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate">{p.name ?? 'Unknown member'} <span className="text-xs text-slate-500">· {p.companyName}</span></span>
                        <span className="shrink-0 tabular-nums text-danger">{p.overdue} overdue</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {/* 5 — Financial attention (per company, per currency; never summed across either) */}
            <Section title="Financial attention" description="Issued, unpaid invoices per company and currency. Amounts are never added across companies or currencies.">
              {data.companies.every((c) => !c.finance) ? (
                <Empty>Finance is not available for your role.</Empty>
              ) : (
                <>
                  <ul className="divide-y divide-line text-sm">
                    {data.companies.filter((c) => c.finance).map((c) => (
                      <li key={c.id} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <span className="min-w-0 truncate font-medium text-ink">{c.name}</span>
                        <span className="text-xs tabular-nums text-slate-600">
                          {c.finance!.overdue.length
                            ? <span className="font-semibold text-danger">Overdue {c.finance!.overdue.map((m) => formatCents(m.openCents, m.currency)).join(' · ')}</span>
                            : 'Nothing overdue'}
                          {c.finance!.draftInvoices ? ` · ${c.finance!.draftInvoices} draft not issued` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {data.overdueInvoices.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {data.overdueInvoices.map((i) => (
                        <li key={i.id} className="flex flex-col gap-0.5 rounded-lg border border-line p-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                          <div className="min-w-0">
                            <CompanyTag name={i.companyName} />
                            <RecordLink item={i} label={`${i.invoiceNumber}${i.customer ? ` · ${i.customer}` : ''}`} k={`i-${i.id}`} className="mt-1 block truncate text-sm font-medium text-ink hover:underline" />
                          </div>
                          <span className="shrink-0 text-xs tabular-nums text-danger">
                            {formatCents(i.openCents, i.currency)} open{i.dueAt ? ` · due ${date(i.dueAt)}` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-3 text-[11px] text-slate-500">Supplier bills and project cost limits are not tracked in MAOS yet.</p>
                </>
              )}
            </Section>

            {/* 6 — Recent activity */}
            <Section title="Recent activity" description="Last 7 days: completed tasks, approval requests and decisions.">
              {data.activity.length === 0 ? (
                <Empty>No activity in the last 7 days.</Empty>
              ) : (
                <ul className="divide-y divide-line">
                  {data.activity.map((e, n) => (
                    <li key={`${e.kind}-${e.href}-${n}`} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">
                          <CompanyTag name={e.companyName} />{' '}
                          {e.kind === 'task_done' ? 'Task completed' : e.kind === 'approval_requested' ? 'Approval requested' : `Approval ${DECISION_LABEL[e.decision ?? ''] ?? 'decided'}`}
                          {e.by ? ` · ${e.by}` : ''}
                        </p>
                        <RecordLink item={e} label={e.title} k={`e-${n}`} />
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-slate-500">{date(e.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </>
      )}
    </PageTransition>
  );
}
