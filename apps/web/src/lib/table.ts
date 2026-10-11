/**
 * Sorting and pagination for the shared DataTable (MAOS-T59).
 *
 * Pure functions, so the behaviour is tested without a browser and every list
 * that adopts the table sorts the same way: numbers numerically, text
 * case-insensitively with natural number order ("Item 2" before "Item 10"),
 * empty values last in both directions, and ties kept in their original order.
 */

export type SortDirection = 'asc' | 'desc';
export type SortValue = string | number | Date | null | undefined;

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function isEmpty(v: SortValue): v is null | undefined | '' {
  return v === null || v === undefined || v === '';
}

function compare(a: SortValue, b: SortValue): number {
  const x = a instanceof Date ? a.getTime() : a;
  const y = b instanceof Date ? b.getTime() : b;
  if (typeof x === 'number' && typeof y === 'number') return x - y;
  return collator.compare(String(x), String(y));
}

export function sortRows<T>(rows: readonly T[], value: (row: T) => SortValue, direction: SortDirection): T[] {
  const sign = direction === 'asc' ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, v: value(row) }))
    .sort((a, b) => {
      const aEmpty = isEmpty(a.v);
      const bEmpty = isEmpty(b.v);
      if (aEmpty || bEmpty) return aEmpty === bEmpty ? a.index - b.index : aEmpty ? 1 : -1;
      return sign * compare(a.v, b.v) || a.index - b.index;
    })
    .map((entry) => entry.row);
}

export interface Page<T> {
  items: T[];
  /** 1-based, clamped into range. */
  page: number;
  pageCount: number;
  total: number;
  /** 1-based index of the first and last row shown; 0 when empty. */
  from: number;
  to: number;
}

export function paginate<T>(rows: readonly T[], page: number, pageSize: number): Page<T> {
  const size = Math.max(1, Math.floor(pageSize) || 1);
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const start = (current - 1) * size;
  const items = rows.slice(start, start + size);
  return { items, page: current, pageCount, total, from: total ? start + 1 : 0, to: start + items.length };
}

/** Next sort state when a column header is clicked: asc, then desc, then asc. */
export function nextSort(
  current: { key: string; direction: SortDirection } | null,
  key: string,
): { key: string; direction: SortDirection } {
  if (current?.key === key) return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  return { key, direction: 'asc' };
}
