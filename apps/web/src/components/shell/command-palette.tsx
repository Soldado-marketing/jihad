'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/fetch';
import { getNavigationForRole } from '@/navigation/navigation';
import type { WorkspaceRole } from '@/navigation/roles';
import {
  flattenResults,
  isPaletteShortcut,
  MIN_QUERY,
  moveSelection,
  quickActions,
  searchPath,
  type PaletteEntry,
  type SearchResponse,
} from '@/lib/search';

/**
 * Global search and quick actions (MAOS-T64). ⌘K / Ctrl+K opens it anywhere
 * in the workspace. Results come from /search, which already applies the
 * caller's permissions, work scope and tenant; quick actions are the pages
 * this role's navigation allows.
 */
export function CommandPalette({ role }: { role: WorkspaceRole }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [entries, setEntries] = useState<PaletteEntry[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [selected, setSelected] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const actions = useMemo(() => quickActions(getNavigationForRole(role)), [role]);

  // Global shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isPaletteShortcut(e)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setEntries([]);
      setSelected(-1);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Debounced search; stale answers are ignored.
  useEffect(() => {
    const path = searchPath(query);
    if (!path) {
      setEntries([]);
      setState('idle');
      return;
    }
    let cancelled = false;
    setState('loading');
    const timer = setTimeout(() => {
      apiFetch<SearchResponse>(path)
        .then((res) => {
          if (cancelled) return;
          setEntries(flattenResults(res));
          setSelected(-1);
          setState('idle');
        })
        .catch(() => !cancelled && setState('error'));
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const searching = query.trim().length >= MIN_QUERY;
  const list = searching ? entries : actions;

  function go(entry: PaletteEntry | undefined) {
    if (!entry) return;
    setOpen(false);
    router.push(entry.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => moveSelection(s, e.key === 'ArrowDown' ? 1 : -1, list.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(list[selected >= 0 ? selected : 0]);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-sm text-muted transition hover:border-accent/40 hover:text-ink"
        aria-label="Search (Command K)"
      >
        <span>Search</span>
        <kbd className="rounded border border-line bg-soft px-1.5 text-xs">⌘K</kbd>
      </button>

      {/* Portal: the top bar's backdrop-filter would otherwise make it the containing
          block of this fixed overlay, confining the backdrop to the header. */}
      {open && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/30 px-4 pt-24" onMouseDown={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search and quick actions"
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-white shadow-shell"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              // Focus on mount, so keys typed right after ⌘K are not lost.
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search customers, projects, tasks, files… or jump to a page"
              maxLength={100}
              className="w-full border-b border-line px-4 py-3 text-sm text-ink placeholder:text-slate-400 focus:outline-none"
              aria-label="Search"
              role="combobox"
              aria-expanded="true"
              aria-controls="palette-list"
            />
            <ul id="palette-list" role="listbox" className="max-h-80 overflow-y-auto py-2">
              {state === 'loading' && searching && <li className="px-4 py-2 text-sm text-muted">Searching…</li>}
              {state === 'error' && searching && <li className="px-4 py-2 text-sm text-danger">Search is unavailable right now.</li>}
              {state === 'idle' && searching && list.length === 0 && <li className="px-4 py-2 text-sm text-muted">No matches.</li>}
              {list.map((entry, i) => {
                const firstOfGroup = i === 0 || list[i - 1].group !== entry.group;
                return (
                  <li key={entry.key} role="option" aria-selected={i === selected}>
                    {firstOfGroup && <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{entry.group}</p>}
                    <button
                      type="button"
                      onMouseEnter={() => setSelected(i)}
                      onClick={() => go(entry)}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm ${i === selected ? 'bg-soft text-ink' : 'text-ink'}`}
                    >
                      <span className="truncate">{entry.label}</span>
                      {entry.hint && <span className="shrink-0 text-xs text-muted">{entry.hint}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-line px-4 py-2 text-xs text-muted">↑↓ to move · Enter to open · Esc to close</p>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
