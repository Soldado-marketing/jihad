/**
 * Activity timeline wording (MAOS-T66).
 *
 * Audit actions are dotted identifiers ("file.version.download"). The
 * timeline shows them as short sentences; known actions get hand-written
 * text, anything else is made readable mechanically.
 */

const KNOWN: Record<string, string> = {
  'invoice.sent': 'Invoice sent',
  'revenue.created': 'Revenue recorded',
  'file.version.upload': 'New file version uploaded',
  'file.version.download': 'File downloaded',
  'notification.created': 'Notification sent',
  'notification.read': 'Notification read',
  'role.changed': 'Role changed',
};

export function activityLabel(action: string): string {
  if (KNOWN[action]) return KNOWN[action];
  const words = action.replace(/[._-]+/g, ' ').trim().toLowerCase();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Activity';
}

/** "just now", "5 min ago", "3 h ago", "2 d ago", then the date. */
export function relativeTime(iso: string, now = new Date()): string {
  const then = new Date(iso);
  const seconds = Math.round((now.getTime() - then.getTime()) / 1000);
  if (!Number.isFinite(seconds)) return '';
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)} d ago`;
  return then.toISOString().slice(0, 10);
}
