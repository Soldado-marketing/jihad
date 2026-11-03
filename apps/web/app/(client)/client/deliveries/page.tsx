'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiFetch } from '@/lib/fetch';
import { DELIVERY_STATUS_LABEL, reviewByLine } from '@/lib/deliveries';
import { type Delivery, KIND_LABEL } from '@/lib/client-portal';

const GROUPS: { status: string; title: string; empty: string }[] = [
  { status: 'REQUESTED', title: 'Waiting for your review', empty: 'Nothing is waiting for your review.' },
  { status: 'CHANGES_REQUESTED', title: 'In revision', empty: 'No revisions in progress.' },
  { status: 'APPROVED', title: 'Approved', empty: 'Nothing approved yet.' },
];

/** My Work: the client's deliveries by status, optionally for one project. */
function MyWork() {
  const params = useSearchParams();
  const [items, setItems] = useState<Delivery[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState(params.get('project') ?? '');

  useEffect(() => {
    apiFetch<Delivery[]>('/client/deliveries')
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load your work.'));
  }, []);

  const projects = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of items ?? []) if (d.project) map.set(d.project.id, d.project.name);
    return [...map.entries()];
  }, [items]);
  const shown = (items ?? []).filter((d) => !project || d.project?.id === project);

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="My Work" title="Your deliveries" description="Open a delivery to view it, download it, approve it or ask for a revision." />
      {projects.length > 1 && (
        <label className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
          Project
          <select value={project} onChange={(e) => setProject(e.target.value)} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm text-ink">
            <option value="">All projects</option>
            {projects.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {items === null && !error && <p className="text-sm text-slate-500">Loading…</p>}
      {items !== null && GROUPS.map((g) => {
        const rows = shown.filter((d) => d.status === g.status);
        return (
          <section key={g.status} aria-labelledby={`group-${g.status}`} className="grid gap-2">
            <h2 id={`group-${g.status}`} className="text-sm font-semibold uppercase tracking-wide text-muted">{g.title} ({rows.length})</h2>
            {rows.length === 0 && <p className="text-sm text-slate-500">{g.empty}</p>}
            <ul className="grid gap-2">
              {rows.map((d) => (
                <li key={d.id}>
                  <Link href={`/client/deliveries/${d.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-4 hover:bg-slate-50">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink">{d.title}</span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {KIND_LABEL[d.kind ?? 'document']}{d.project ? ` · ${d.project.name}` : ''}{d.versionNumber ? ` · Version ${d.versionNumber}` : ''} · {new Date(d.updatedAt).toLocaleDateString()}
                      </span>
                      {(() => {
                        const due = reviewByLine(d.reviewBy, d.status);
                        return due ? <span className={`mt-0.5 block text-xs ${due.urgent ? 'font-medium text-amber-700' : 'text-muted'}`}>{due.text}</span> : null;
                      })()}
                    </span>
                    <StatusBadge status={d.status} label={DELIVERY_STATUS_LABEL[d.status]} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export default function ClientDeliveriesPage() {
  return <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}><MyWork /></Suspense>;
}
