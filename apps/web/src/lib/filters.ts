/**
 * List filters kept in the URL (MAOS-T60).
 *
 * The URL is the single source of truth for a list's filters, so a filtered
 * view can be reloaded, shared and later saved. These pure helpers read and
 * write that state and apply it to rows the page already loaded.
 */

export interface FilterDefinition {
  /** Query-string key. */
  key: string;
  /** Allowed values; anything else in the URL is ignored. */
  options: readonly string[];
}

export interface FilterState {
  q: string;
  values: Record<string, string>;
}

const MAX_QUERY = 100;

export function readFilters(params: URLSearchParams, definitions: readonly FilterDefinition[]): FilterState {
  const values: Record<string, string> = {};
  for (const d of definitions) {
    const v = params.get(d.key);
    if (v && d.options.includes(v)) values[d.key] = v;
  }
  return { q: (params.get('q') ?? '').trim().slice(0, MAX_QUERY), values };
}

/** The query string for a state; keeps unrelated params, drops empty ones. */
export function writeFilters(params: URLSearchParams, state: FilterState, definitions: readonly FilterDefinition[]): string {
  const next = new URLSearchParams(params);
  const q = state.q.trim().slice(0, MAX_QUERY);
  if (q) next.set('q', q);
  else next.delete('q');
  for (const d of definitions) {
    const v = state.values[d.key];
    if (v && d.options.includes(v)) next.set(d.key, v);
    else next.delete(d.key);
  }
  return next.toString();
}

/**
 * Rows matching the state: every selected filter must equal the row's value,
 * and the search text must appear (case- and accent-insensitive) in at least
 * one of the searchable fields.
 */
export function applyFilters<T>(
  rows: readonly T[],
  state: FilterState,
  fieldOf: (row: T, key: string) => string | null | undefined,
  searchable: readonly string[],
): T[] {
  const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const needle = norm(state.q);
  return rows.filter((row) => {
    for (const [key, value] of Object.entries(state.values)) {
      if ((fieldOf(row, key) ?? '') !== value) return false;
    }
    if (!needle) return true;
    return searchable.some((key) => norm(fieldOf(row, key) ?? '').includes(needle));
  });
}
