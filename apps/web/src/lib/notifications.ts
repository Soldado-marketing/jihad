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
