/**
 * Custom project board lists (owner approval 2026-10-29): which list each
 * card shows in. Lists are the project's own workflow; Task.status stays the
 * internal state used by reports, My Work and permissions.
 */

import { sortByOrder } from './board-order';
import type { Task, TaskStatus } from './task-types';

export type BoardList = {
  id: string;
  projectId: string;
  name: string;
  sortOrder: number;
  /** Status a card takes when moved into the list; null keeps its status. */
  status: TaskStatus | null;
  archivedAt: string | null;
};

/** Cards that fit no list (no list yet and no list mapped to their status). */
export const UNLISTED = 'unlisted';

export function activeLists(lists: readonly BoardList[]): BoardList[] {
  return lists.filter((l) => !l.archivedAt).sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Card placement, ordered by sortOrder: a card's own active list; else, for a
 * card without a list, the first active list mapped to its status; else the
 * "not in a list" group. Cards of an archived list stay hidden with it, and an
 * archived task without a list stays off the board as before.
 */
export function placeCards(tasks: readonly Task[], lists: readonly BoardList[]): Map<string, Task[]> {
  const active = activeLists(lists);
  const archived = new Set(lists.filter((l) => l.archivedAt).map((l) => l.id));
  const groups = new Map<string, Task[]>([...active.map((l) => [l.id, [] as Task[]] as const), [UNLISTED, []]]);
  for (const task of sortByOrder(tasks)) {
    if (task.listId && groups.has(task.listId)) {
      groups.get(task.listId)!.push(task);
      continue;
    }
    if (task.listId && archived.has(task.listId)) continue;
    if (task.status === 'ARCHIVED') continue;
    const mapped = active.find((l) => l.status === task.status);
    groups.get(mapped ? mapped.id : UNLISTED)!.push(task);
  }
  return groups;
}

/** OWNER and MANAGER shape the board (project UPDATE); everyone else moves cards. */
export function canManageLists(role: string | undefined): boolean {
  return role === 'OWNER' || role === 'MANAGER';
}
