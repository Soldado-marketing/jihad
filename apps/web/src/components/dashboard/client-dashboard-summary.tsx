'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ErrorState } from '@/components/states/error-state';
import { apiFetch } from '@/lib/fetch';
import { type Appointment, type ClientInvoice, type ClientProblem, type Delivery, KIND_LABEL, money, remainingCents, when } from '@/lib/client-portal';

type Action = { key: string; label: string; detail: string; href: string; cta: string };
type Part = 'deliveries' | 'appointments' | 'invoices' | 'problems';
const NOT_LOADED = 'could not be loaded';

/**
 * The client's starting point: everything that waits for them, then three
 * short figures that open their section. All data comes from /client routes,
 * so it only ever covers the caller's own records.
 */
export function ClientDashboardSummary() {
  const [deliveries, setDeliveries] = useState<Delivery[] | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [problems, setProblems] = useState<ClientProblem[]>([]);

  // Which parts could not be loaded. Each part loads on its own, so one
  // failure does not blank the rest - but a failed part is never shown as
  // "nothing waiting" or "all invoices are paid" (F04).
  const [failed, setFailed] = useState<Set<Part>>(new Set());

  const load = useCallback(() => {
    const missed = new Set<Part>();
    const without = <T,>(name: Part) => (): T[] => { missed.add(name); return []; };
    void Promise.all([
      apiFetch<Delivery[]>('/client/deliveries').catch(without<Delivery>('deliveries')),
      apiFetch<Appointment[]>('/client/appointments').catch(without<Appointment>('appointments')),
      apiFetch<ClientInvoice[]>('/client/invoices').catch(without<ClientInvoice>('invoices')),
      apiFetch<ClientProblem[]>('/client/problems').catch(without<ClientProblem>('problems')),
    ]).then(([d, a, i, r]) => { setDeliveries(d); setAppointments(a); setInvoices(i); setProblems(r); setFailed(missed); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const now = Date.now();
  const toReview = (deliveries ?? []).filter((d) => d.status === 'REQUESTED');
  const upcoming = appointments.filter((a) => a.status === 'SCHEDULED' && new Date(a.startsAt).getTime() > now);
  const toConfirm = upcoming.filter((a) => !a.seenCurrent);
  const open = invoices.filter((i) => i.status !== 'VOID' && remainingCents(i) > 0);
  const answered = problems.filter((r) => r.status === 'ANSWERED');
  const actions: Action[] = [
    ...answered.map((r) => ({ key: `r${r.id}`, label: r.subject, detail: 'our management answered your problem report', href: `/client/problems/${r.id}`, cta: 'Read answer' })),
    ...toReview.map((d) => ({ key: `d${d.id}`, label: d.title, detail: [KIND_LABEL[d.kind ?? 'document'], d.project?.name, 'ready for your review'].filter(Boolean).join(' · '), href: `/client/deliveries/${d.id}`, cta: 'Review' })),
    ...toConfirm.map((a) => ({ key: `a${a.id}`, label: a.title, detail: `${when(a.startsAt)} · ${a.location}`, href: `/client/appointments#appointment-${a.id}`, cta: 'See appointment' })),
    ...open.map((i) => ({ key: `i${i.id}`, label: `Invoice ${i.invoiceNumber}`, detail: `${money(remainingCents(i), i.currency)} open${i.dueAt ? ` · due ${new Date(i.dueAt).toLocaleDateString()}` : ''}`, href: `/client/invoices/${i.id}`, cta: 'View invoice' })),
  ];
  const next = upcoming[0];
  const balance = open.reduce((sum, i) => sum + remainingCents(i), 0);
  const currency = open[0]?.currency ?? invoices[0]?.currency ?? 'EUR';

  return (
    // grid-cols-1: one column that may shrink; otherwise a long file name widens the page on a phone.
    <div className="grid grid-cols-1 gap-6">
      <section aria-labelledby="waiting-title" className="rounded-2xl border border-line bg-white p-5 shadow-card">
        <h3 id="waiting-title" className="font-semibold text-ink">Waiting for you</h3>
        {deliveries === null && <p className="mt-2 text-sm text-slate-500">Loading…</p>}
        {failed.size > 0 && <div className="mt-2"><ErrorState title="Part of your overview could not be loaded" message="What you see below may be incomplete." onRetry={load} /></div>}
        {deliveries !== null && failed.size === 0 && actions.length === 0 && <p className="mt-2 text-sm text-slate-600">You are all set. Nothing needs your attention right now.</p>}
        <ul className="mt-3 divide-y divide-line">
          {actions.map((a) => (
            <li key={a.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink">{a.label}</span>
                <span className="block text-xs text-muted">{a.detail}</span>
              </span>
              <Link href={a.href} className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white">{a.cta}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Overview" className="grid gap-3 md:grid-cols-3">
        <Card href="/client/deliveries" label="My Work" value={failed.has('deliveries') ? '—' : deliveries ? String(toReview.length) : '…'} detail={failed.has('deliveries') ? NOT_LOADED : 'deliveries waiting for your review'} />
        <Card href="/client/appointments" label="Next shooting" value={next ? when(next.startsAt) : '—'} detail={failed.has('appointments') ? NOT_LOADED : next ? next.location : 'No appointment planned'} />
        <Card href="/client/invoices" label="Open balance" value={failed.has('invoices') ? '—' : money(balance, currency)} detail={failed.has('invoices') ? NOT_LOADED : open.length ? `${open.length} open invoice${open.length > 1 ? 's' : ''}` : 'All invoices are paid'} />
      </section>
    </div>
  );
}

function Card({ href, label, value, detail }: { href: string; label: string; value: string; detail: string }) {
  return (
    <Link href={href} className="block rounded-2xl border border-line bg-panel p-5 shadow-card hover:border-accent focus-visible:border-accent">
      <span className="block text-sm font-semibold text-muted">{label}</span>
      <span className="mt-2 block text-2xl font-semibold tracking-tight text-ink">{value}</span>
      <span className="mt-1 block truncate text-sm text-slate-600">{detail}</span>
    </Link>
  );
}
