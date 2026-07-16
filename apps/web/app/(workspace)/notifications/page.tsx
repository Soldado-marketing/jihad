'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetch';
import { PageHeader } from '@/components/ui/page-header';

type Notification = { id: string; title: string; body: string; status: string; createdAt: string };

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  async function load() {
    try { setItems(await apiFetch<Notification[]>('/notifications')); }
    catch { /* silently fail */ }
    finally { setLoading(false); }
  }

  async function markRead(id: string) {
    try { await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }); load(); }
    catch { /* ignore */ }
  }

  async function markAllRead() {
    try { await apiFetch('/notifications/read-all', { method: 'PATCH' }); load(); }
    catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Workspace" title="Notifications"
        description="Stay up to date with workspace alerts and activity updates."
        actions={items.some(n => n.status === 'UNREAD') && (
          <button onClick={markAllRead} className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-slate-50">
            Mark all read
          </button>
        )}
      />
      {loading && <p className="text-sm text-muted">Loading…</p>}
      {!loading && items.length === 0 && <p className="text-center text-sm text-muted py-12">No notifications.</p>}
      <ul className="divide-y divide-line rounded-xl border border-line bg-white overflow-hidden">
        {items.map(n => (
          <li key={n.id} className={`flex items-start gap-4 p-4 ${n.status==='UNREAD' ? 'bg-blue-50/40' : ''}`}>
            {n.status === 'UNREAD' && <span className="mt-2 h-2 w-2 rounded-full bg-brand flex-shrink-0" />}
            {n.status !== 'UNREAD' && <span className="mt-2 h-2 w-2 rounded-full bg-transparent flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink">{n.title}</p>
              <p className="text-sm text-muted mt-0.5">{n.body}</p>
              <p className="text-xs text-muted/60 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
            {n.status === 'UNREAD' && (
              <button onClick={() => markRead(n.id)} className="flex-shrink-0 text-xs text-brand hover:underline">Mark read</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}