'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ActivityTimeline } from '@/components/ui/activity-timeline';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { fileSize, kpis, progressText, tabsFor, type CustomerOverview, type Tab } from '@/lib/customer-360';
import { STATUS_LABEL } from '@/lib/customers';
import { apiFetch } from '@/lib/fetch';
import { formatCents } from '@/lib/money';

const TAB_LABEL: Record<Tab, string> = { overview: 'Overview', projects: 'Projects', files: 'Files', notes: 'Notes' };
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : '—');

/**
 * Customer 360 (MAOS-T55; Blueprint §10, §43.2). Everything comes from one
 * permission-filtered read (T54): a tab or block appears only when the API
 * sent that section, and money only reaches the OWNER.
 */
export default function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<CustomerOverview | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError('');
    apiFetch<CustomerOverview>(`/customers/${id}/overview`)
      .then((d) => !cancelled && setData(d))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load this customer.'));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) return <p role="alert" className="p-6 text-sm text-danger">{error}</p>;
  if (!data) return <p className="p-6 text-sm text-muted">Loading…</p>;

  const { customer } = data;
  const tabs = tabsFor(data);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Customer 360"
        title={customer.name}
        description={[STATUS_LABEL[customer.status], customer.industry, customer.responsibleUser?.displayName && `Responsible: ${customer.responsibleUser.displayName}`]
          .filter(Boolean)
          .join(' · ')}
        actions={<Link href="/customers" className="rounded-lg border border-line px-4 py-2 text-sm font-medium">All customers</Link>}
      />

      <div role="tablist" aria-label="Customer sections" className="flex gap-1 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === t ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'}`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6" role="tabpanel">
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {kpis(data).map((k) => <KpiCard key={k.key} label={k.label} value={k.value} />)}
          </div>

          {data.finance && (
            <section className="rounded-xl border border-line bg-white p-5" aria-label="Finance">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Finance (owner only)</h2>
              {data.finance.totals.length === 0 && <p className="mt-2 text-sm text-muted">No billed invoices yet.</p>}
              <dl className="mt-3 grid gap-4 sm:grid-cols-3">
                {data.finance.totals.flatMap((t) => [
                  <div key={`${t.currency}-i`}><dt className="text-xs text-muted">Invoiced</dt><dd className="tabular-nums text-ink">{formatCents(t.invoicedCents, t.currency)}</dd></div>,
                  <div key={`${t.currency}-p`}><dt className="text-xs text-muted">Paid</dt><dd className="tabular-nums text-ink">{formatCents(t.paidCents, t.currency)}</dd></div>,
                  <div key={`${t.currency}-o`}><dt className="text-xs text-muted">Outstanding</dt><dd className="tabular-nums font-medium text-ink">{formatCents(t.outstandingCents, t.currency)}</dd></div>,
                ])}
              </dl>
            </section>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {data.tasks && (
              <section className="rounded-xl border border-line bg-white" aria-label="Upcoming tasks">
                <h2 className="border-b border-line px-5 py-3 text-sm font-semibold uppercase tracking-wide text-muted">Upcoming tasks</h2>
                {data.tasks.upcoming.length === 0 && <p className="px-5 py-6 text-sm text-muted">No open tasks with a due date.</p>}
                <ul className="divide-y divide-line">
                  {data.tasks.upcoming.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                      <span className="text-ink">{t.title}<span className="ms-2 text-xs text-muted">{t.assignedTo?.displayName ?? ''}</span></span>
                      <span className="tabular-nums text-muted">{day(t.dueAt)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {data.approvals && (
              <section className="rounded-xl border border-line bg-white" aria-label="Open approvals">
                <h2 className="border-b border-line px-5 py-3 text-sm font-semibold uppercase tracking-wide text-muted">Open approvals</h2>
                {data.approvals.open.length === 0 && <p className="px-5 py-6 text-sm text-muted">Nothing waiting for approval.</p>}
                <ul className="divide-y divide-line">
                  {data.approvals.open.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                      <span className="text-ink">{a.title}</span>
                      <span className="text-xs text-muted">{a.status}{a.dueAt ? ` · ${day(a.dueAt)}` : ''}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {data.invoices && (
              <section className="rounded-xl border border-line bg-white" aria-label="Invoices">
                <h2 className="border-b border-line px-5 py-3 text-sm font-semibold uppercase tracking-wide text-muted">Invoices</h2>
                {data.invoices.recent.length === 0 && <p className="px-5 py-6 text-sm text-muted">No invoices yet.</p>}
                <ul className="divide-y divide-line">
                  {data.invoices.recent.map((i) => (
                    <li key={i.id}>
                      <Link href={`/finance/invoices/${i.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-slate-50">
                        <span className="text-ink">{i.invoiceNumber}</span>
                        <span className="text-xs text-muted">{i.status} · due {day(i.dueAt)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* The timeline renders its own "Activity" heading. */}
          <ActivityTimeline resourceType="customer" resourceId={customer.id} />
        </div>
      )}

      {tab === 'projects' && data.projects && (
        <div role="tabpanel" className="overflow-hidden rounded-xl border border-line bg-white">
          {data.projects.items.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted">No projects for this customer.</p>}
          <ul className="divide-y divide-line">
            {data.projects.items.map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className="grid gap-2 px-5 py-3 text-sm hover:bg-slate-50 sm:grid-cols-7">
                  <span className="font-medium text-ink sm:col-span-2">{p.projectNumber ? <code className="me-2 text-xs text-muted">{p.projectNumber}</code> : null}{p.name}</span>
                  <span className="text-muted">{p.serviceType ?? '—'}</span>
                  <span className="tabular-nums text-muted">{progressText(p.progress)}</span>
                  <span className="tabular-nums text-muted">{day(p.deadline)}</span>
                  <span className="text-xs text-muted">{p.status}</span>
                  {/* Present only for the OWNER; never derived here. */}
                  {p.budgetCents !== undefined && (
                    <span className="tabular-nums text-muted sm:text-right">{p.budgetCents === null ? '—' : formatCents(p.budgetCents)}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          {data.projects.total > data.projects.items.length && (
            <p className="border-t border-line px-5 py-2 text-xs text-muted">Showing {data.projects.items.length} of {data.projects.total}.</p>
          )}
        </div>
      )}

      {tab === 'files' && data.files && (
        <div role="tabpanel" className="overflow-hidden rounded-xl border border-line bg-white">
          {data.files.recent.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted">No files for this customer.</p>}
          <ul className="divide-y divide-line">
            {data.files.recent.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="text-ink">{f.name}</span>
                <span className="tabular-nums text-xs text-muted">{fileSize(f.sizeBytes)} · {day(f.createdAt)}</span>
              </li>
            ))}
          </ul>
          {data.files.total > data.files.recent.length && (
            <p className="border-t border-line px-5 py-2 text-xs text-muted">The {data.files.recent.length} newest of {data.files.total} files.</p>
          )}
        </div>
      )}

      {tab === 'notes' && (
        <div role="tabpanel" className="rounded-xl border border-line bg-white p-5 text-sm">
          {customer.notes ? <p className="whitespace-pre-wrap text-ink">{customer.notes}</p> : <p className="text-muted">No notes. Notes are edited on the customer list.</p>}
          {customer.website && (
            <p className="mt-4 text-xs text-muted">Website: <a href={customer.website} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{customer.website}</a></p>
          )}
        </div>
      )}
    </div>
  );
}
