'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/fetch';
import { type Appointment, when } from '@/lib/client-portal';

/** Shooting appointments: when, where and what to prepare, and "I've seen this". */
export default function ClientAppointmentsPage() {
  const [items, setItems] = useState<Appointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    apiFetch<Appointment[]>('/client/appointments')
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load your appointments.'));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function seen(id: string) {
    setBusy(id);
    setError(null);
    try {
      await apiFetch(`/client/appointments/${id}/seen`, { method: 'POST' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that.');
    } finally {
      setBusy(null);
    }
  }

  const now = Date.now();
  const upcoming = (items ?? []).filter((a) => new Date(a.startsAt).getTime() >= now);
  const past = (items ?? []).filter((a) => new Date(a.startsAt).getTime() < now).reverse();

  const card = (a: Appointment) => (
    <li key={a.id} id={`appointment-${a.id}`} className="scroll-mt-24 rounded-xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-ink">{a.title}{a.project ? <span className="font-normal text-muted"> · {a.project.name}</span> : null}</p>
          <p className={`mt-1 text-lg ${a.status === 'CANCELLED' ? 'text-slate-400 line-through' : 'text-ink'}`}>{when(a.startsAt)}</p>
        </div>
        {a.status === 'CANCELLED' ? (
          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">Cancelled</span>
        ) : a.seenCurrent ? (
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">Seen ✓</span>
        ) : (
          <button type="button" disabled={busy === a.id} onClick={() => void seen(a.id)} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
            {a.seenAt ? 'Changed – confirm again' : "I've seen this appointment"}
          </button>
        )}
      </div>
      {a.location && (
        <p className="mt-3 text-sm text-slate-700">
          <span className="font-medium text-ink">Location: </span>{a.location}{' '}
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.location)}`} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">Map</a>
        </p>
      )}
      {a.preparation && (
        <div className="mt-3 text-sm">
          <p className="font-medium text-ink">Please prepare</p>
          <p className="mt-1 whitespace-pre-wrap text-slate-700">{a.preparation}</p>
        </div>
      )}
    </li>
  );

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Appointments" title="Shooting appointments" description="When and where we film, and how to prepare. Let us know you have seen each appointment." />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {items === null && !error && <p className="text-sm text-slate-500">Loading…</p>}
      {items !== null && (
        <>
          <section aria-labelledby="upcoming" className="grid gap-2">
            <h2 id="upcoming" className="text-sm font-semibold uppercase tracking-wide text-muted">Upcoming ({upcoming.length})</h2>
            {upcoming.length === 0 && <p className="text-sm text-slate-500">No shooting planned right now.</p>}
            <ul className="grid gap-3">{upcoming.map(card)}</ul>
          </section>
          {past.length > 0 && (
            <section aria-labelledby="past" className="grid gap-2">
              <h2 id="past" className="text-sm font-semibold uppercase tracking-wide text-muted">Past</h2>
              <ul className="grid gap-3 opacity-80">{past.map(card)}</ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
