/**
 * CSV import/export page (MAOS-T118).
 * Run: node --test test/data-transfer.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { canExport, canImport, columnsHint, importLabel, MAX_CSV_CHARS, reportSummary, tooLarge, TRANSFER_TYPES } from '../src/lib/data-transfer.ts';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (p) => readFileSync(join(webRoot, p), 'utf8');
const page = read('app/(workspace)/data/page.tsx');

describe('import/export page', () => {
  it('offers export and import per role like the API defaults', () => {
    const matrix = (fn) => ['OWNER', 'MANAGER', 'EMPLOYEE', 'CONTRACTOR', 'CLIENT', undefined].map((r) => TRANSFER_TYPES.map((t) => (fn(r, t) ? 1 : 0)).join(''));
    assert.deepEqual(matrix(canExport), ['111', '111', '111', '011', '000', '000']);
    assert.deepEqual(matrix(canImport), ['111', '111', '001', '001', '000', '000']);
  });

  it('refuses a file over the API limit before upload', () => {
    assert.equal(tooLarge('x'.repeat(MAX_CSV_CHARS)), null);
    assert.match(tooLarge('x'.repeat(MAX_CSV_CHARS + 1)), /too large/);
  });

  it('summarises the report honestly', () => {
    assert.equal(reportSummary({ rows: 3, valid: true, committed: false, created: 0, errors: [] }), '3 rows checked, no problems. Nothing has been written yet.');
    assert.equal(reportSummary({ rows: 3, valid: true, committed: true, created: 3, errors: [] }), 'Imported 3 rows.');
    assert.match(reportSummary({ rows: 3, valid: false, committed: false, created: 0, errors: [{}], errorCount: 4 }), /^4 problems found\. Nothing was imported/);
  });

  it('shows owner-only columns to the OWNER only (runtime check finding)', () => {
    assert.equal(columnsHint('projects', 'MANAGER'), 'name*, projectNumber, status (ACTIVE|PAUSED|ARCHIVED), customerKey, serviceType, deadline (YYYY-MM-DD), description');
    assert.match(columnsHint('projects', 'OWNER'), /, ownerEmail, budgetCents \(whole cents\)$/);
    for (const role of ['MANAGER', 'EMPLOYEE', 'CONTRACTOR']) {
      for (const t of TRANSFER_TYPES) assert.ok(!/Email|budgetCents/.test(columnsHint(t, role)), `${role} ${t}`);
    }
  });

  it('labels the import button with a correct row count (runtime check finding)', () => {
    assert.equal(importLabel(null), 'Import');
    assert.equal(importLabel({ rows: 1, valid: true, committed: false }), 'Import 1 row');
    assert.equal(importLabel({ rows: 2, valid: true, committed: false }), 'Import 2 rows');
    assert.equal(importLabel({ rows: 2, valid: false, committed: false }), 'Import');
    assert.equal(importLabel({ rows: 2, valid: true, committed: true }), 'Import');
    assert.equal(reportSummary({ rows: 1, valid: true, committed: true, created: 1, errors: [] }), 'Imported 1 row.');
  });

  it('does not claim an export re-imports as is (create-only)', () => {
    assert.ok(!page.includes('can be imported as is'));
    assert.match(page, /already exists is reported as a duplicate/);
  });

  it('checks before it imports and imports only a valid, unchanged file', () => {
    assert.match(page, /send\(false\)/);
    assert.match(page, /disabled=\{!csv \|\| busy \|\| !report\?\.valid \|\| report\.committed\}/);
    assert.match(page, /apiBlob\(`\/data\/export\/\$\{type\}`/);
    // A new file clears the previous report, so a checked file cannot be swapped before import.
    assert.match(page, /async function pick[\s\S]*?setReport\(null\)/);
  });

  it('is in the navigation and the sidebar, never for clients', () => {
    const nav = read('src/navigation/navigation.ts');
    assert.match(nav, /id: 'data',[\s\S]*?allowedRoles: \['OWNER', 'MANAGER', 'EMPLOYEE', 'CONTRACTOR'\],[\s\S]*?clientSafe: false/);
    assert.match(read('src/components/shell/sidebar.tsx'), /'data', 'settings'/);
  });
});
