/** What a client reads for a delivery's status (the stored values are approval statuses). */
export const DELIVERY_STATUS_LABEL: Record<string, string> = {
  REQUESTED: 'Ready for your review',
  CHANGES_REQUESTED: 'In revision',
  APPROVED: 'Approved',
};

/** One line of a delivery conversation as the client sees it. */
export function threadLine(kind: string, from: 'client' | 'company', company: string): string {
  const who = from === 'client' ? 'You' : company;
  switch (kind) {
    case 'DELIVERED': return `${company} delivered`;
    case 'APPROVE': return `${who} approved`;
    case 'REQUEST_CHANGES': return `${who} asked for a revision`;
    case 'REVISION_SENT': return `${company} sent a revision`;
    default: return who;
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The review-by line the client and staff read for a delivery (plan row D03).
 * null when no date was set; `urgent` within the last 24 hours and after it.
 */
export function reviewByLine(
  reviewBy: string | null | undefined,
  status: string,
  now: Date = new Date(),
): { text: string; urgent: boolean } | null {
  if (!reviewBy) return null;
  const at = new Date(reviewBy);
  if (Number.isNaN(at.getTime())) return null;
  const when = at.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  if (status !== 'REQUESTED') return { text: `Review was asked for by ${when}`, urgent: false };
  const left = at.getTime() - now.getTime();
  if (left <= 0) return { text: `Review was due ${when}`, urgent: true };
  if (left <= DAY_MS) return { text: `Review due ${when} (within 24 hours)`, urgent: true };
  return { text: `Review by ${when}`, urgent: false };
}

/** The value a datetime-local input sends, as the ISO string the API stores; null when empty or not a date. */
export function reviewByToIso(local: string): string | null {
  if (!local.trim()) return null;
  const at = new Date(local);
  return Number.isNaN(at.getTime()) ? null : at.toISOString();
}
