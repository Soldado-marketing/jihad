/**
 * My Work view model (MAOS-T68): the shape of GET /my-work and the numbers
 * the page leads with.
 */

export type WorkTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueAt: string | null;
  project: { id: string; name: string } | null;
};
export type WorkApproval = { id: string; title: string; dueAt: string | null; createdAt: string };
export type WorkFollowUp = { id: string; title: string; status: string; dueAt: string | null };
export type WorkNotification = { id: string; title: string; status: string; createdAt: string };

export interface MyWork {
  generatedAt: string;
  tasks: { overdue: WorkTask[]; dueSoon: WorkTask[]; blocked: WorkTask[]; open: WorkTask[] };
  approvals: { toDecide: WorkApproval[]; requested: WorkApproval[] };
  followUps: WorkFollowUp[];
  notifications: { unread: number; latest: WorkNotification[] };
}

export function summarizeMyWork(w: MyWork) {
  const counts = {
    overdue: w.tasks.overdue.length,
    dueSoon: w.tasks.dueSoon.length,
    blocked: w.tasks.blocked.length,
    toDecide: w.approvals.toDecide.length,
  };
  const nothing =
    Object.values(counts).every((n) => n === 0) &&
    w.tasks.open.length === 0 &&
    w.approvals.requested.length === 0 &&
    w.followUps.length === 0 &&
    w.notifications.unread === 0;
  return { counts, nothing };
}

/** "Due 12 Oct" / "Overdue since 9 Oct" / "No due date" (UTC dates). */
export function dueText(dueAt: string | null, now = new Date()): string {
  if (!dueAt) return 'No due date';
  const d = new Date(dueAt);
  if (Number.isNaN(d.getTime())) return 'No due date';
  const day = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return d.getTime() < now.getTime() ? `Overdue since ${day}` : `Due ${day}`;
}
