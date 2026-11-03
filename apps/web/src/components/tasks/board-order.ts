/**
 * Card order on the task board, persisted in the existing Task.sortOrder
 * through PATCH /tasks/reorder (tenant- and scope-checked, one transaction).
 */

export const ORDER_STEP = 1000;

/** The list's card ids with `id` moved to `index` (removed first if already there). */
export function moveCard(ids: readonly string[], id: string, index: number): string[] {
  const rest = ids.filter((x) => x !== id);
  const at = Math.max(0, Math.min(index, rest.length));
  return [...rest.slice(0, at), id, ...rest.slice(at)];
}

/** Evenly spaced sortOrder values for a list, top to bottom. */
export function reorderItems(ids: readonly string[]): { id: string; sortOrder: number }[] {
  return ids.map((id, i) => ({ id, sortOrder: (i + 1) * ORDER_STEP }));
}

/** Same order as the API: sortOrder ascending, unordered cards last, otherwise stable. */
export function sortByOrder<T extends { sortOrder?: number | null }>(tasks: readonly T[]): T[] {
  return tasks
    .map((task, i) => ({ task, i }))
    .sort((a, b) => {
      const x = a.task.sortOrder ?? null;
      const y = b.task.sortOrder ?? null;
      if (x === y) return a.i - b.i;
      if (x === null) return 1;
      if (y === null) return -1;
      return x - y;
    })
    .map(({ task }) => task);
}

/** Drop position in a list: before the first card whose vertical midpoint is below the pointer. */
export function dropIndex(cardMidpoints: readonly number[], pointerY: number): number {
  const i = cardMidpoints.findIndex((mid) => pointerY < mid);
  return i === -1 ? cardMidpoints.length : i;
}
