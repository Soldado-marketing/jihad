'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetch';
import { type Appointment, when } from '@/lib/client-portal';

type Form = { id: string | null; title: string; startsAt: string; location: string; preparation: string };
const EMPTY: Form = { id: null, title: '', startsAt: '', location: '', preparation: '' };
const inputCls = 'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink';

/** Local "YYYY-MM-DDTHH:mm" for a datetime-local input. */
function localInput(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

/**
 * Shooting appointments for one project (appointments.service.ts). The client
 * of the project is notified on every change and sees date, place and
 * preparation only, never who is filming.
 */
export function ProjectAppointmentsPanel({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<Appointment[] | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof Form, value: string) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const load = useCallback(() => {
    apiFetch<Appointment[]>(`/appointments?projectId=${encodeURIComponent(projectId)}`).then(setItems).catch(() => setItems([]));
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    setBusy(true);
    setError(null);
    const body = {
      startsAt: new Date(form.startsAt).toISOString(),
      location: form.location.trim(),
      ...(form.title.trim() ? { title: form.title.trim() } : {}),
      preparation: form.preparation.trim(),
    };
    try {
      await apiFetch(form.id ? `/appointments/${form.id}` : '/appointments', {
        method: form.id ? 'PATCH' : 'POST',
        body: JSON.stringify(form.id ? body : { ...body, projectId }),
      });
      setForm(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the appointment.');
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    if (!window.confirm('Cancel this appointment? The client will be told.')) return;
    setError(null);
    try {
      await apiFetch(`/appointments/${id}/cancel`, { method: 'POST' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel the appointment.');
    }
  }

  return (
    <section aria-labelledby="appointments-title" className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-slate-50 px-5 py-3">
        <h2 id="appointments-title" className="text-sm font-semibold uppercase tracking-wide text-muted">Shooting appointments ({items?.filter((a) => a.status === 'SCHEDULED').length ?? 0})</h2>
        {!form && <button type="button" onClick={() => setForm(EMPTY)} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white">Schedule shooting</button>}
      </div>

      {form && (
        <form onSubmit={save} className="grid gap-3 border-b border-line p-5 sm:grid-cols-2">
          <label className="text-sm"><span className="mb-1 block text-slate-700">Date and time</span>
            <input type="datetime-local" required name="startsAt" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} className={inputCls} /></label>
          <label className="text-sm"><span className="mb-1 block text-slate-700">Title (optional)</span>
            <input name="title" value={form.title} maxLength={120} placeholder="Shooting appointment" onChange={(e) => set('title', e.target.value)} className={inputCls} /></label>
          <label className="text-sm sm:col-span-2"><span className="mb-1 block text-slate-700">Location</span>
            <input required minLength={2} maxLength={300} name="location" value={form.location} onChange={(e) => set('location', e.target.value)} className={inputCls} /></label>
          <label className="text-sm sm:col-span-2"><span className="mb-1 block text-slate-700">What should the client prepare?</span>
            <textarea rows={3} maxLength={2000} name="preparation" value={form.preparation} onChange={(e) => set('preparation', e.target.value)} className={inputCls} /></label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button type="submit" disabled={busy} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{form.id ? 'Save changes' : 'Schedule and notify client'}</button>
            <button type="button" onClick={() => setForm(null)} className="px-3 text-sm text-muted">Close</button>
          </div>
        </form>
      )}
      {error && <p role="alert" className="px-5 pt-3 text-sm text-red-600">{error}</p>}

      {items?.length === 0 && !form && <p className="py-6 text-center text-sm text-muted">No shooting scheduled.</p>}
      <ul className="divide-y divide-line">
        {items?.map((a) => (
          <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
            <div className="min-w-0 text-sm">
              <p className={a.status === 'CANCELLED' ? 'text-slate-400 line-through' : 'font-medium text-ink'}>{when(a.startsAt)} · {a.title}</p>
              <p className="text-muted">{a.location}</p>
              <p className="text-xs text-muted">
                {a.status === 'CANCELLED' ? 'Cancelled' : a.seenCurrent ? 'Client has seen it ✓' : a.seenAt ? 'Changed since the client saw it' : 'Not seen by the client yet'}
              </p>
            </div>
            {a.status === 'SCHEDULED' && (
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm({ id: a.id, title: a.title, startsAt: localInput(a.startsAt), location: a.location, preparation: a.preparation ?? '' })} className="rounded-lg border border-line px-3 py-1 text-xs">Edit</button>
                <button type="button" onClick={() => void cancel(a.id)} className="rounded-lg border border-line px-3 py-1 text-xs text-red-700">Cancel</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
