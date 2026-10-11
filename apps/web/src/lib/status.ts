/**
 * One status vocabulary for every badge (MAOS-T61).
 *
 * Tasks, the CRM pipeline, invoices, payments, follow-ups, meetings, approvals
 * and notifications all show a status. Each used its own colours; this maps
 * every known value to one of five tones and a readable label, so the same
 * meaning always looks the same. Unknown values read as neutral.
 */

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<string, StatusTone> = {
  // done / settled / positive
  DONE: 'success', COMPLETED: 'success', WON: 'success', PAID: 'success', APPROVED: 'success',
  RECORDED: 'success', ACTIVE: 'success', READ: 'neutral',
  // moving / open
  IN_PROGRESS: 'info', CONTACTED: 'info', MEETING: 'info', PROPOSAL: 'info', NEGOTIATION: 'info',
  SENT: 'info', SCHEDULED: 'info', OPEN: 'info', UNREAD: 'info', PARTIALLY_PAID: 'info', PENDING: 'info',
  // needs attention
  IN_REVIEW: 'warning', REQUESTED: 'warning', CHANGES_REQUESTED: 'warning', PARTIAL: 'warning',
  PENDING_APPROVAL: 'warning', DRAFT: 'warning',
  // stopped / bad
  BLOCKED: 'danger', LOST: 'danger', OVERDUE: 'danger', FAILED: 'danger', REJECTED: 'danger',
  VOID: 'danger', SUSPENDED: 'danger',
  // inert
  TODO: 'neutral', LEAD: 'neutral', ARCHIVED: 'neutral', CANCELED: 'neutral', CANCELLED: 'neutral',
  REFUNDED: 'neutral',
};

const LABELS: Record<string, string> = { TODO: 'To do' };

export function statusTone(status: string): StatusTone {
  return TONES[status?.toUpperCase?.() ?? ''] ?? 'neutral';
}

/** IN_PROGRESS -> "In progress"; explicit overrides where the words differ. */
export function statusLabel(status: string): string {
  if (!status) return '—';
  const key = status.toUpperCase();
  if (LABELS[key]) return LABELS[key];
  const words = key.toLowerCase().split('_').join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'border-line bg-panel text-slate-600',
  info: 'border-blue-300 bg-blue-50 text-blue-700',
  success: 'border-accent/25 bg-accent/10 text-accent',
  warning: 'border-warning/25 bg-warning/10 text-warning',
  danger: 'border-danger/25 bg-danger/10 text-danger',
};
