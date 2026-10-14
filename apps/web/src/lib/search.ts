/**
 * Global search UI model (MAOS-T64). Pure helpers so the palette's rules are
 * tested without a browser: where each result opens, the order of the flat
 * keyboard list, and which quick actions a role is offered.
 */

import type { NavigationItem } from '@/navigation/navigation';

export const MIN_QUERY = 2;

export type SearchType = 'customers' | 'projects' | 'tasks' | 'files';

export interface SearchResponse {
  q: string;
  types: SearchType[];
  results: {
    customers?: { id: string; name: string; status: string }[];
    projects?: { id: string; name: string; status: string }[];
    tasks?: { id: string; title: string; status: string; projectId: string | null }[];
    files?: { id: string; name: string; projectId: string | null }[];
  };
}

export interface PaletteEntry {
  key: string;
  group: string;
  label: string;
  hint?: string;
  href: string;
}

export const GROUP_LABEL: Record<SearchType, string> = {
  customers: 'Customers',
  projects: 'Projects',
  tasks: 'Tasks',
  files: 'Files',
};

/** The search request path, or null while the query is too short. */
export function searchPath(query: string): string | null {
  const q = query.trim();
  if (q.length < MIN_QUERY) return null;
  return `/search?q=${encodeURIComponent(q.slice(0, 100))}`;
}

/** One flat, keyboard-navigable list in a fixed group order. */
export function flattenResults(res: SearchResponse): PaletteEntry[] {
  const out: PaletteEntry[] = [];
  for (const c of res.results.customers ?? []) {
    // No customer detail page yet: open the list filtered to this customer.
    out.push({ key: `customers:${c.id}`, group: GROUP_LABEL.customers, label: c.name, hint: c.status, href: `/customers?q=${encodeURIComponent(c.name)}` });
  }
  for (const p of res.results.projects ?? []) {
    out.push({ key: `projects:${p.id}`, group: GROUP_LABEL.projects, label: p.name, hint: p.status, href: `/projects/${p.id}` });
  }
  for (const t of res.results.tasks ?? []) {
    out.push({ key: `tasks:${t.id}`, group: GROUP_LABEL.tasks, label: t.title, hint: t.status, href: `/tasks/${t.id}` });
  }
  for (const f of res.results.files ?? []) {
    out.push({ key: `files:${f.id}`, group: GROUP_LABEL.files, label: f.name, href: `/files/${f.id}` });
  }
  return out;
}

/** Quick actions: the pages this role's navigation allows, plus "go to" shortcuts. */
export function quickActions(nav: readonly NavigationItem[]): PaletteEntry[] {
  return nav
    .filter((n) => n.href.startsWith('/'))
    .map((n) => ({ key: `nav:${n.id}`, group: 'Go to', label: n.label, href: n.href }));
}

/** Arrow-key movement that wraps around; -1 when the list is empty. */
export function moveSelection(current: number, delta: 1 | -1, length: number): number {
  if (length === 0) return -1;
  if (current < 0) return delta === 1 ? 0 : length - 1;
  return (current + delta + length) % length;
}

/** ⌘K on macOS, Ctrl+K elsewhere. */
export function isPaletteShortcut(e: { key: string; metaKey: boolean; ctrlKey: boolean }): boolean {
  return e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey);
}
