/**
 * URL-held list filters (MAOS-T60).
 * Run: node --test test/filter-bar.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { applyFilters, readFilters, writeFilters } from '../src/lib/filters.ts';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const defs = [{ key: 'status', options: ['LEAD', 'WON'] }];

describe('filter state in the URL', () => {
  it('reads only allowed values and trims the search text', () => {
    const s = readFilters(new URLSearchParams('q=  acme &status=WON&other=1'), defs);
    assert.deepEqual(s, { q: 'acme', values: { status: 'WON' } });
    assert.deepEqual(readFilters(new URLSearchParams('status=HACKED'), defs).values, {});
  });

  it('writes the state back, keeping unrelated params and dropping empty ones', () => {
    const qs = writeFilters(new URLSearchParams('page=2&q=old&status=LEAD'), { q: 'new', values: { status: '' } }, defs);
    assert.equal(qs, 'page=2&q=new');
    assert.equal(writeFilters(new URLSearchParams(), { q: 'x', values: { status: 'BOGUS' } }, defs), 'q=x');
  });

  it('round-trips', () => {
    const state = { q: 'müller', values: { status: 'LEAD' } };
    assert.deepEqual(readFilters(new URLSearchParams(writeFilters(new URLSearchParams(), state, defs)), defs), state);
  });
});

describe('applyFilters', () => {
  const rows = [
    { name: 'Müller GmbH', email: 'info@mueller.de', status: 'LEAD' },
    { name: 'Acme', email: 'hi@acme.com', status: 'WON' },
    { name: 'Globex', email: null, status: 'LEAD' },
  ];
  const field = (r, k) => r[k];

  it('matches search text case- and accent-insensitively across fields', () => {
    assert.deepEqual(applyFilters(rows, { q: 'MULLER', values: {} }, field, ['name', 'email']).map((r) => r.name), ['Müller GmbH']);
    assert.deepEqual(applyFilters(rows, { q: 'acme.com', values: {} }, field, ['name', 'email']).map((r) => r.name), ['Acme']);
  });

  it('requires every selected filter and returns all rows when empty', () => {
    assert.deepEqual(applyFilters(rows, { q: '', values: { status: 'LEAD' } }, field, ['name']).map((r) => r.name), ['Müller GmbH', 'Globex']);
    assert.equal(applyFilters(rows, { q: '', values: {} }, field, ['name']).length, 3);
  });
});

describe('pilot', () => {
  it('the leads list uses the URL filters inside a Suspense boundary', () => {
    const page = readFileSync(join(webRoot, 'app/(workspace)/crm/leads/page.tsx'), 'utf8');
    assert.match(page, /<Suspense/);
    assert.match(page, /<FilterBar fields=\{LEAD_FILTERS\}/);
    assert.match(page, /rows=\{visible\}/);
    const bar = readFileSync(join(webRoot, 'src/components/ui/filter-bar.tsx'), 'utf8');
    assert.match(bar, /router\.replace\(/, 'typing must not flood the history');
    assert.match(bar, /role="search"/);
  });
});
