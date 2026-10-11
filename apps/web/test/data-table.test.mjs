/**
 * Shared DataTable: sorting and pagination (MAOS-T59).
 * Run: node --test test/data-table.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { nextSort, paginate, sortRows } from '../src/lib/table.ts';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const names = (rows) => rows.map((r) => r.n);

describe('sortRows', () => {
  const rows = [{ n: 'beta', v: 10 }, { n: 'Alpha', v: 2 }, { n: 'item 10', v: null }, { n: 'item 2', v: 2 }, { n: '', v: 5 }];

  it('sorts text case-insensitively in natural order, empty last, both directions', () => {
    assert.deepEqual(names(sortRows(rows, (r) => r.n, 'asc')), ['Alpha', 'beta', 'item 2', 'item 10', '']);
    assert.deepEqual(names(sortRows(rows, (r) => r.n, 'desc')), ['item 10', 'item 2', 'beta', 'Alpha', '']);
  });

  it('sorts numbers numerically, keeps ties stable and puts null last', () => {
    assert.deepEqual(names(sortRows(rows, (r) => r.v, 'asc')), ['Alpha', 'item 2', '', 'beta', 'item 10']);
  });

  it('does not mutate the input', () => {
    const copy = [...rows];
    sortRows(rows, (r) => r.n, 'asc');
    assert.deepEqual(rows, copy);
  });
});

describe('paginate', () => {
  const rows = Array.from({ length: 53 }, (_, i) => i + 1);

  it('returns the requested page with range info', () => {
    assert.deepEqual(paginate(rows, 2, 25), { items: rows.slice(25, 50), page: 2, pageCount: 3, total: 53, from: 26, to: 50 });
  });

  it('clamps out-of-range pages and handles empty lists', () => {
    assert.equal(paginate(rows, 99, 25).page, 3);
    assert.equal(paginate(rows, 0, 25).page, 1);
    assert.deepEqual(paginate([], 1, 25), { items: [], page: 1, pageCount: 1, total: 0, from: 0, to: 0 });
  });
});

describe('nextSort and pilot', () => {
  it('toggles asc/desc on the same column and starts asc on a new one', () => {
    assert.deepEqual(nextSort(null, 'a'), { key: 'a', direction: 'asc' });
    assert.deepEqual(nextSort({ key: 'a', direction: 'asc' }, 'a'), { key: 'a', direction: 'desc' });
    assert.deepEqual(nextSort({ key: 'a', direction: 'desc' }, 'b'), { key: 'b', direction: 'asc' });
  });

  it('the leads list uses the shared table with accessible sort state', () => {
    assert.match(readFileSync(join(webRoot, 'app/(workspace)/crm/leads/page.tsx'), 'utf8'), /<DataTable/);
    assert.match(readFileSync(join(webRoot, 'src/components/ui/data-table.tsx'), 'utf8'), /aria-sort=/);
  });
});
