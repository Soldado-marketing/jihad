'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { nextSort, paginate, sortRows, type SortDirection, type SortValue } from '@/lib/table';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Makes the column sortable by this value. */
  sortValue?: (row: T) => SortValue;
  align?: 'left' | 'right';
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  pageSize?: number;
  initialSort?: { key: string; direction: SortDirection };
  /** Accessible name for the table. */
  label: string;
}

/**
 * The shared list table (MAOS-T59): sortable headers and client-side
 * pagination over rows the page already loaded. Rendering stays with the
 * caller through `render`; sorting and paging live in lib/table.
 */
export function DataTable<T>({ columns, rows, rowKey, pageSize = 25, initialSort, label }: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; direction: SortDirection } | null>(initialSort ?? null);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sort) return [...rows];
    const column = columns.find((c) => c.key === sort.key);
    return column?.sortValue ? sortRows(rows, column.sortValue, sort.direction) : [...rows];
  }, [rows, columns, sort]);
  const view = paginate(sorted, page, pageSize);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem]" aria-label={label}>
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-muted">
            <tr>
              {columns.map((c) => {
                const active = sort !== null && sort.key === c.key;
                const ariaSort = active && sort ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none';
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={c.sortValue ? ariaSort : undefined}
                    className={`px-4 py-3 ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSort((s) => nextSort(s, c.key));
                          setPage(1);
                        }}
                        className="inline-flex items-center gap-1 uppercase hover:text-ink"
                      >
                        {c.header}
                        <span aria-hidden="true">{active && sort ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}</span>
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {view.items.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-slate-50">
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 text-sm ${c.align === 'right' ? 'text-right' : ''}`}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {view.pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-line px-4 py-2 text-xs text-muted">
          <span>
            {view.from}–{view.to} of {view.total}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage(view.page - 1)}
              disabled={view.page <= 1}
              className="rounded-md border border-line px-2 py-1 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage(view.page + 1)}
              disabled={view.page >= view.pageCount}
              className="rounded-md border border-line px-2 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
