/**
 * Approval queue ordering (MAOS-T108).
 *
 * Waiting = still decidable (REQUESTED, CHANGES_REQUESTED). The queue puts
 * overdue items first, then those with the nearest due date, then undated
 * ones oldest first - so the longest-waiting request is never buried.
 */

export type QueueApproval = {
  id: string;
  title: string;
  status: string;
  dueAt: string | null;
  createdAt: string;
  fileAsset?: { id: string; name: string } | null;
  decisions?: { id: string; decision: string; createdAt: string }[];
};

export const WAITING_STATUSES = ['REQUESTED', 'CHANGES_REQUESTED'];

export function splitQueue<T extends QueueApproval>(items: readonly T[]): { waiting: T[]; decided: T[] } {
  const waiting = items.filter((a) => WAITING_STATUSES.includes(a.status));
  const decided = items.filter((a) => !WAITING_STATUSES.includes(a.status));
  waiting.sort((a, b) => {
    const da = a.dueAt ? Date.parse(a.dueAt) : Number.POSITIVE_INFINITY;
    const db = b.dueAt ? Date.parse(b.dueAt) : Number.POSITIVE_INFINITY;
    return da - db || Date.parse(a.createdAt) - Date.parse(b.createdAt);
  });
  decided.sort((a, b) => Date.parse(lastDecision(b)) - Date.parse(lastDecision(a)));
  return { waiting, decided };
}

function lastDecision(a: QueueApproval): string {
  return a.decisions?.reduce((max, d) => (d.createdAt > max ? d.createdAt : max), a.createdAt) ?? a.createdAt;
}

export function isOverdue(a: QueueApproval, now = new Date()): boolean {
  return Boolean(a.dueAt) && Date.parse(a.dueAt as string) < now.getTime();
}

/** "Waiting 3 days" / "Waiting since today". */
export function waitingText(createdAt: string, now = new Date()): string {
  const days = Math.floor((now.getTime() - Date.parse(createdAt)) / 86400000);
  if (!Number.isFinite(days) || days <= 0) return 'Waiting since today';
  return days === 1 ? 'Waiting 1 day' : `Waiting ${days} days`;
}
