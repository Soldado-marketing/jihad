'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/fetch';
import { NOTIFICATIONS_CHANGED, notificationHref, parseUnreadCount, UNREAD_REFRESH_MS, unreadBadgeLabel } from '@/lib/notifications';

type BellItem = {
  id: string; title: string; body?: string | null; status: string; createdAt: string;
  resourceType?: string | null; resourceId?: string | null;
};

/**
 * Unread count + latest notifications in the workspace top bar (MAOS-T48).
 * Uses the existing self-scoped endpoints only; every failure degrades to an
 * empty bell instead of an error in the shell.
 */
/** `portal` decides where items and "View all" lead: the client portal only to its own pages. */
export function NotificationBell({ portal = 'workspace' }: { portal?: 'client' | 'workspace' } = {}) {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<BellItem[] | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    try {
      setCount(parseUnreadCount(await apiFetch<unknown>('/notifications/unread-count')));
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    void refreshCount();
    const timer = setInterval(() => void refreshCount(), UNREAD_REFRESH_MS);
    const onFocus = () => void refreshCount();
    window.addEventListener('focus', onFocus);
    window.addEventListener(NOTIFICATIONS_CHANGED, onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(NOTIFICATIONS_CHANGED, onFocus);
    };
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panel.current && !panel.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      try {
        const all = await apiFetch<BellItem[]>('/notifications');
        setItems(Array.isArray(all) ? all.slice(0, 5) : []);
      } catch {
        setItems([]);
      }
    }
  }

  async function markRead(id: string) {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
      setItems((list) => list?.map((n) => (n.id === id ? { ...n, status: 'READ' } : n)) ?? null);
      await refreshCount();
    } catch {
      /* the full page offers a retry */
    }
  }

  async function markAllRead() {
    try {
      await apiFetch('/notifications/read-all', { method: 'PATCH' });
      setItems((list) => list?.map((n) => ({ ...n, status: 'READ' })) ?? null);
      await refreshCount();
    } catch {
      /* the next refresh shows the real state */
    }
  }

  const label = unreadBadgeLabel(count);

  return (
    <div className="relative" ref={panel}>
      <button
        type="button"
        onClick={() => void toggle()}
        aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative rounded-lg border border-line bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-ink"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {label && (
          <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-brand px-1.5 text-center text-[11px] font-semibold leading-5 text-white">
            {label}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-2">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            <span className="flex items-center gap-3">
              {count > 0 && (
                <button type="button" onClick={() => void markAllRead()} className="text-xs text-brand hover:underline">
                  Mark all read
                </button>
              )}
              <Link href={portal === 'client' ? '/client/notifications' : '/notifications'} onClick={() => setOpen(false)} className="text-xs text-brand hover:underline">
                View all
              </Link>
            </span>
          </div>
          {items === null && <p className="px-4 py-6 text-sm text-muted">Loading…</p>}
          {items !== null && items.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted">No notifications.</p>}
          {items !== null && items.length > 0 && (
            <ul className="max-h-96 divide-y divide-line overflow-y-auto">
              {items.map((n) => {
                const href = notificationHref(n.resourceType, n.resourceId, portal);
                const text = (
                  <>
                    <p className="truncate text-sm font-medium text-ink">{n.title}</p>
                    {n.body && <p className="line-clamp-2 text-xs text-muted">{n.body}</p>}
                  </>
                );
                return (
                <li key={n.id} className={`flex items-start gap-3 px-4 py-3 ${n.status === 'UNREAD' ? 'bg-blue-50/40' : ''}`}>
                  {href ? (
                    <Link href={href} className="min-w-0 flex-1 hover:underline"
                      onClick={() => { setOpen(false); if (n.status === 'UNREAD') void markRead(n.id); }}>
                      {text}
                    </Link>
                  ) : (
                    <div className="min-w-0 flex-1">{text}</div>
                  )}
                  {n.status === 'UNREAD' && (
                    <button type="button" onClick={() => void markRead(n.id)} className="shrink-0 text-xs text-brand hover:underline">
                      Mark read
                    </button>
                  )}
                </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
