/**
 * Notification bell helpers (MAOS-T48).
 *
 * GET /notifications/unread-count answers with a bare number; anything else
 * (an error page, an empty body) must read as zero rather than break the bar.
 */
export function parseUnreadCount(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/** Badge text: nothing at zero, the number up to 9, then "9+". */
export function unreadBadgeLabel(count: number): string {
  if (count <= 0) return '';
  return count > 9 ? '9+' : String(count);
}

/** How often the bell refreshes while the tab is open. */
export const UNREAD_REFRESH_MS = 60_000;

/**
 * Where a notification leads, by the resource it points at. The client portal
 * links only to its own /client pages; anything else stays a plain line.
 */
/** Fired on window when a page marks notifications read, so the bell recounts at once. */
export const NOTIFICATIONS_CHANGED = 'maos:notifications-changed';

export function notificationHref(
  resourceType: string | null | undefined,
  resourceId: string | null | undefined,
  portal: 'client' | 'workspace',
): string | null {
  if (!resourceType) return null;
  const id = resourceId ? encodeURIComponent(resourceId) : '';
  if (portal === 'client') {
    switch (resourceType) {
      case 'delivery': return id ? `/client/deliveries/${id}` : '/client/deliveries';
      case 'invoice': return id ? `/client/invoices/${id}` : '/client/invoices';
      case 'payment': return '/client/invoices';
      case 'appointment': return id ? `/client/appointments#appointment-${id}` : '/client/appointments';
      default: return null;
    }
  }
  switch (resourceType) {
    case 'approval': return id ? `/approvals?open=${id}` : '/approvals';
    case 'file': return id ? `/files/${id}` : '/files';
    case 'invoice': return id ? `/finance/invoices/${id}` : '/finance/invoices';
    case 'project': return id ? `/projects/${id}` : '/projects';
    case 'task':
    case 'appointment': return '/tasks';
    case 'time-entry': return '/time';
    default: return null;
  }
}
