/**
 * Global search UI and command palette (MAOS-T64).
 * Run: node --test test/global-search.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { flattenResults, isPaletteShortcut, moveSelection, quickActions, searchPath } from '../src/lib/search.ts';
import { getNavigationForRole } from '../src/navigation/navigation.ts';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (p) => readFileSync(join(webRoot, p), 'utf8');

describe('global search UI', () => {
  it('asks the API only from 2 characters, encoded and capped', () => {
    assert.equal(searchPath(' a '), null);
    assert.equal(searchPath('ab'), '/search?q=ab');
    assert.equal(searchPath('a&b=c'), '/search?q=a%26b%3Dc');
    assert.equal(searchPath('x'.repeat(150)), `/search?q=${'x'.repeat(100)}`);
  });

  it('flattens results in a fixed group order with the right links', () => {
    const entries = flattenResults({
      q: 'acme',
      types: ['customers', 'projects', 'tasks', 'files'],
      results: {
        files: [{ id: 'f1', name: 'brief.pdf', projectId: null }],
        tasks: [{ id: 't1', title: 'Fix', status: 'TODO', projectId: 'p1' }],
        customers: [{ id: 'c1', name: 'Acme & Co', status: 'ACTIVE' }],
        projects: [{ id: 'p1', name: 'Site', status: 'ACTIVE' }],
      },
    });
    assert.deepEqual(entries.map((e) => [e.group, e.href]), [
      ['Customers', '/customers?q=Acme%20%26%20Co'],
      ['Projects', '/projects/p1'],
      ['Tasks', '/tasks/t1'],
      ['Files', '/files/f1'],
    ]);
    assert.deepEqual(flattenResults({ q: 'x', types: [], results: {} }), []);
  });

  it('offers quick actions only for pages the role may open', () => {
    const contractor = quickActions(getNavigationForRole('CONTRACTOR')).map((a) => a.href);
    assert.ok(contractor.includes('/my-work'));
    assert.ok(!contractor.includes('/customers'), 'contractors cannot read customers');
    assert.ok(!contractor.includes('/dashboard/admin/invites'));
    const owner = quickActions(getNavigationForRole('OWNER')).map((a) => a.href);
    assert.ok(owner.includes('/customers') && owner.includes('/dashboard/admin/invites'));
    assert.ok(owner.every((h) => h.startsWith('/')), 'no placeholder anchors');
  });

  it('moves the selection with wrap-around', () => {
    assert.equal(moveSelection(-1, 1, 3), 0);
    assert.equal(moveSelection(-1, -1, 3), 2);
    assert.equal(moveSelection(2, 1, 3), 0);
    assert.equal(moveSelection(0, -1, 3), 2);
    assert.equal(moveSelection(0, 1, 0), -1);
  });

  it('opens on ⌘K or Ctrl+K only', () => {
    assert.equal(isPaletteShortcut({ key: 'k', metaKey: true, ctrlKey: false }), true);
    assert.equal(isPaletteShortcut({ key: 'K', metaKey: false, ctrlKey: true }), true);
    assert.equal(isPaletteShortcut({ key: 'k', metaKey: false, ctrlKey: false }), false);
    assert.equal(isPaletteShortcut({ key: 'j', metaKey: true, ctrlKey: false }), false);
  });

  it('the top bar mounts the palette, which calls the search API', () => {
    assert.match(read('src/components/shell/topbar.tsx'), /<CommandPalette role=\{role\} \/>/);
    const palette = read('src/components/shell/command-palette.tsx');
    assert.match(palette, /apiFetch<SearchResponse>\(path\)/);
    assert.match(palette, /role="dialog"/);
    assert.match(palette, /aria-modal="true"/);
    // Rendered into document.body: the top bar's backdrop-filter would trap a fixed overlay.
    assert.match(palette, /createPortal\([\s\S]*document\.body,\s*\)/);
  });
});
