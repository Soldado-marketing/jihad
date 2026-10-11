'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { readFilters, writeFilters, type FilterDefinition, type FilterState } from '@/lib/filters';

export interface FilterBarField extends FilterDefinition {
  label: string;
  /** Display text per option; defaults to the value. */
  optionLabel?: (value: string) => string;
}

/** Reads the list's filter state from the URL (MAOS-T60). */
export function useUrlFilters(fields: readonly FilterBarField[]): FilterState {
  const params = useSearchParams();
  return useMemo(() => readFilters(new URLSearchParams(params.toString()), fields), [params, fields]);
}

/**
 * Search box + select filters whose state lives in the URL, so a filtered
 * view survives reloads and can be shared. Typing is debounced; the URL is
 * replaced (not pushed) so Back leaves the list instead of undoing keystrokes.
 */
export function FilterBar({ fields, placeholder = 'Search…' }: { fields: readonly FilterBarField[]; placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const state = useUrlFilters(fields);
  const [text, setText] = useState(state.q);

  useEffect(() => setText(state.q), [state.q]);

  function commit(next: FilterState) {
    const qs = writeFilters(new URLSearchParams(params.toString()), next, fields);
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  useEffect(() => {
    if (text === state.q) return;
    const timer = setTimeout(() => commit({ ...state, q: text }), 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const active = Boolean(state.q) || Object.keys(state.values).length > 0;

  return (
    <div role="search" className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        maxLength={100}
        className="min-w-48 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm"
      />
      {fields.map((f) => (
        <select
          key={f.key}
          aria-label={f.label}
          value={state.values[f.key] ?? ''}
          onChange={(e) => commit({ ...state, q: text, values: { ...state.values, [f.key]: e.target.value } })}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="">{`All ${f.label.toLowerCase()}`}</option>
          {f.options.map((o) => (
            <option key={o} value={o}>
              {f.optionLabel ? f.optionLabel(o) : o}
            </option>
          ))}
        </select>
      ))}
      {active && (
        <button
          type="button"
          onClick={() => {
            setText('');
            commit({ q: '', values: {} });
          }}
          className="px-2 py-2 text-sm text-muted hover:text-ink"
        >
          Clear
        </button>
      )}
    </div>
  );
}
