/**
 * Project enrichment UI (MAOS-T58; Blueprint §11 on the T57 fields).
 * Run: node --test test/projects.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { register } from 'node:module';

// lib/projects.ts imports './money' the way Next resolves it; Node's type
// stripping needs the extension, so this test-only hook adds it for
// extensionless relative imports.
register(
  'data:text/javascript,export async function resolve(s, c, next) { try { return await next(s, c); } catch (e) { if (s.startsWith(".") && !/\\.[cm]?[jt]s$/.test(s)) return next(s + ".ts", c); throw e; } }',
  import.meta.url,
);
const { budgetLabel, canSeeBudget, canWriteProjects, centsToInput, deadlineState, formFrom, progressLabel, projectField, updatePayload } =
  await import('../src/lib/projects.ts');

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (p) => readFileSync(join(webRoot, p), 'utf8');
const row = (over = {}) => ({
  id: 'p1', name: 'Website', status: 'ACTIVE', projectNumber: 'P-0001', serviceType: 'SEO', deadline: '2026-11-01T00:00:00.000Z',
  owner: { id: 'u1', displayName: 'Ann' }, customer: { id: 'c1', name: 'Acme' }, progress: { done: 1, total: 4, percent: 25 }, ...over,
});

describe('project enrichment UI', () => {
  it('OWNER and MANAGER edit; only the OWNER sees the budget', () => {
    assert.deepEqual(['OWNER', 'MANAGER', 'EMPLOYEE', 'CONTRACTOR', 'CLIENT', undefined].map(canWriteProjects), [true, true, false, false, false, false]);
    assert.deepEqual(['OWNER', 'MANAGER', 'EMPLOYEE', undefined].map(canSeeBudget), [true, false, false, false]);
  });

  it('labels progress, budget and money without floats', () => {
    assert.equal(progressLabel({ done: 1, total: 4, percent: 25 }), '25% · 1/4');
    assert.equal(progressLabel({ done: 0, total: 0, percent: null }), 'No tasks');
    assert.equal(budgetLabel({ budgetCents: 125005 }), '1250.05 EUR');
    assert.equal(budgetLabel({}), '—', 'absent for non-owners');
    assert.equal(budgetLabel({ budgetCents: null }), '—');
    assert.equal(centsToInput(7), '0.07');
  });

  it('flags overdue and soon deadlines, never archived projects', () => {
    const today = '2026-10-15';
    assert.equal(deadlineState(row({ deadline: '2026-10-14T00:00:00.000Z' }), today), 'overdue');
    assert.equal(deadlineState(row({ deadline: '2026-10-22T00:00:00.000Z' }), today), 'soon');
    assert.equal(deadlineState(row({ deadline: '2026-10-23T00:00:00.000Z' }), today), null);
    assert.equal(deadlineState(row({ deadline: '2026-10-01T00:00:00.000Z', status: 'ARCHIVED' }), today), null);
    assert.equal(deadlineState(row({ deadline: null }), today), null);
  });

  it('feeds filters and text search with real values', () => {
    const p = row();
    assert.deepEqual(['status', 'customer', 'service', 'name', 'number', 'other'].map((k) => projectField(p, k)), ['ACTIVE', 'Acme', 'SEO', 'Website', 'P-0001', null]);
  });

  it('sends only changed fields, clears with null, never a client key', () => {
    const before = row({ budgetCents: 100000 });
    const form = { ...formFrom(before), serviceType: '', deadline: '2026-12-24', customerId: '', projectNumber: ' P-0002 ' };
    const r = updatePayload(before, form, 'MANAGER');
    assert.deepEqual(r, { ok: true, body: { projectNumber: 'P-0002', serviceType: null, deadline: '2026-12-24T00:00:00.000Z', customerId: null } });
    assert.ok(!('clientScopeKey' in r.body));
    assert.deepEqual(updatePayload(before, formFrom(before), 'OWNER'), { ok: true, body: {} }, 'unchanged form sends nothing');
  });

  it('sends the budget in integer cents, and only for the OWNER', () => {
    const before = row({ budgetCents: 100000 });
    assert.deepEqual(updatePayload(before, { ...formFrom(before), budget: '1250.05' }, 'OWNER').body, { budgetCents: 125005 });
    assert.deepEqual(updatePayload(before, { ...formFrom(before), budget: '' }, 'OWNER').body, { budgetCents: null });
    assert.deepEqual(updatePayload(before, { ...formFrom(before), budget: '1' }, 'MANAGER').body, {}, 'a manager never sends a budget');
    assert.equal(updatePayload(before, { ...formFrom(before), budget: '12,50' }, 'OWNER').ok, false);
  });

  it('validates like the API', () => {
    const before = row();
    assert.equal(updatePayload(before, { ...formFrom(before), name: ' x ' }, 'OWNER').ok, false);
    assert.equal(updatePayload(before, { ...formFrom(before), projectNumber: 'has space' }, 'OWNER').ok, false);
    assert.equal(updatePayload(before, { ...formFrom(before), serviceType: 'x'.repeat(81) }, 'OWNER').ok, false);
  });

  it('pages show the budget only behind the owner check and use the shared table', () => {
    const list = read('app/(workspace)/projects/page.tsx');
    assert.match(list, /canSeeBudget\(role\)\s*\?\s*\[\{ key: 'budget'/);
    assert.match(list, /<DataTable/);
    assert.match(list, /applyFilters\(projects, filters, projectField/);
    const detail = read('app/(workspace)/projects/[id]/page.tsx');
    assert.match(detail, /canSeeBudget\(role\) \? \[\['Budget'/);
    assert.match(detail, /\{canSeeBudget\(role\) && \(\s*<label/);
    assert.ok(!detail.includes('clientScopeKey'));
  });
});
