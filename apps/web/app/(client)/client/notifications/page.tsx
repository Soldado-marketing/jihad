'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/fetch';
import { NOTIFICATIONS_CHANGED, notificationHref } from '@/lib/notifications';

type Item = { id: string; title: string; body?: string | null; status: string; createdAt: string; resourceType?: string | null; resourceId?: string | null };

/** All of the client's own notifications; each opens what it is about. */
export default function ClientNotificationsPage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const load = useCallback(() => {
    apiFetch<Item[]>('/notifications').then(setItems).catch(() => setItems([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const changed = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
  const read = (id: string) => apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }).then(changed).catch(() => undefined);
  async function readAll() {
    await apiFetch('/notifications/read-all', { method: 'PATCH' }).catch(() => undefined);
    changed();
    load();
  }

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Notifications" title="Notifications" description="Updates about your work, invoices and appointments." />
      {items?.some((n) => n.status === 'UNREAD') && (
        <div><button type="button" onClick={() => void readAll()} className="rounded-lg border border-line px-3 py-1.5 text-sm">Mark all as read</button></div>
      )}
      {items === null && <p className="text-sm text-slate-500">Loading…</p>}
      {items?.length === 0 && <p className="rounded-xl border border-line bg-white p-8 text-center text-sm text-muted">No notifications yet.</p>}
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
        {items?.map((n) => {
          const href = notificationHref(n.resourceType, n.resourceId, 'client');
          const body = (
            <span className="block min-w-0">
              <span className={`block text-sm ${n.status === 'UNREAD' ? 'font-semibold text-ink' : 'text-slate-700'}`}>{n.title}</span>
              {n.body && <span className="block truncate text-xs text-muted">{n.body}</span>}
              <span className="block text-xs text-muted">{new Date(n.createdAt).toLocaleString()}</span>
            </span>
          );
          return (
            <li key={n.id} className={n.status === 'UNREAD' ? 'bg-blue-50/40' : ''}>
              {href
                ? <Link href={href} onClick={() => { if (n.status === 'UNREAD') void read(n.id); }} className="block px-5 py-3 hover:bg-slate-50">{body}</Link>
                : <div className="px-5 py-3">{body}</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
