/**
 * Customer list UI (MAOS-T53, ADR-017).
 * Run: node --test test/customers.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { canArchive, canWriteCustomers, createPayload, customerField, industryOptions, statusChoices, updatePayload } from '../src/lib/customers.ts';
import { applyFilters } from '../src/lib/filters.ts';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (p) => readFileSync(join(webRoot, p), 'utf8');
const row = (over = {}) => ({
  id: 'c1', clientScopeKey: 'acme', name: 'Acme', status: 'ACTIVE', industry: 'Retail', website: null, notes: null,
  responsibleUser: null, _count: { projects: 0, invoices: 0, fileAssets: 0 }, createdAt: '', updatedAt: '', ...over,
});
const form = { name: 'Acme GmbH', clientScopeKey: 'acme-gmbh', industry: '', website: '', notes: '' };

describe('customer list UI', () => {
  it('OWNER and MANAGER write; only OWNER archives; EMPLOYEE reads', () => {
    assert.deepEqual(['OWNER', 'MANAGER', 'EMPLOYEE', 'CONTRACTOR', 'CLIENT', undefined].map(canWriteCustomers), [true, true, false, false, false, false]);
    assert.deepEqual(['OWNER', 'MANAGER', 'EMPLOYEE'].map(canArchive), [true, false, false]);
  });

  it('offers archive/restore only to the OWNER', () => {
    assert.deepEqual(statusChoices('OWNER', 'ACTIVE'), ['ACTIVE', 'INACTIVE', 'ARCHIVED']);
    assert.deepEqual(statusChoices('MANAGER', 'ACTIVE'), ['ACTIVE', 'INACTIVE']);
    assert.deepEqual(statusChoices('MANAGER', 'ARCHIVED'), ['ARCHIVED'], 'a manager cannot restore');
  });

  it('text search matches name and client key, not only industry (F-5)', () => {
    const rows = [row({ id: 'a', name: 'Acme GmbH', clientScopeKey: 'acme', industry: 'Retail' }), row({ id: 'b', name: 'Beta AG', clientScopeKey: 'beta-key', industry: 'Auto' })];
    const search = (q, values = {}) => applyFilters(rows, { q, values }, customerField, ['name', 'clientScopeKey', 'industry']).map((r) => r.id);
    assert.deepEqual(search('acme gm'), ['a'], 'by name');
    assert.deepEqual(search('BETA-K'), ['b'], 'by key, case-insensitive');
    assert.deepEqual(search('auto'), ['b'], 'by industry');
    assert.deepEqual(search('', { status: 'ACTIVE', industry: 'Retail' }), ['a'], 'filters still apply');
    assert.equal(customerField(rows[0], 'unknown'), null);
  });

  it('the page searches through customerField', () => {
    assert.match(read('app/(workspace)/customers/page.tsx'), /applyFilters\(rows, filters, customerField,/);
  });

  it('builds industry filter options from the data, sorted and without blanks', () => {
    assert.deepEqual(industryOptions([row({ industry: 'Retail' }), row({ industry: ' ' }), row({ industry: null }), row({ industry: 'Auto' }), row({ industry: 'Retail' })]), ['Auto', 'Retail']);
  });

  it('validates the create form like the API and leaves empty optionals out', () => {
    assert.deepEqual(createPayload(form), { ok: true, body: { name: 'Acme GmbH', clientScopeKey: 'acme-gmbh' } });
    for (const key of ['', 'has space', '-start', 'x'.repeat(121)]) assert.equal(createPayload({ ...form, clientScopeKey: key }).ok, false, key);
    assert.equal(createPayload({ ...form, name: '  ' }).ok, false);
    assert.equal(createPayload({ ...form, website: 'acme.example' }).ok, false);
    assert.deepEqual(createPayload({ ...form, website: 'https://acme.example', industry: ' Retail ' }).body, { name: 'Acme GmbH', clientScopeKey: 'acme-gmbh', industry: 'Retail', website: 'https://acme.example' });
  });

  it('sends only changed fields on edit, clears with null, and never the client key', () => {
    const before = row({ industry: 'Retail', website: 'https://a.example' });
    const r = updatePayload(before, { name: 'Acme', status: 'INACTIVE', industry: '', website: 'https://a.example', notes: 'VIP' });
    assert.deepEqual(r, { ok: true, body: { status: 'INACTIVE', industry: null, notes: 'VIP' } });
    assert.ok(!('clientScopeKey' in r.body));
    assert.deepEqual(updatePayload(before, { name: 'Acme', status: 'ACTIVE', industry: 'Retail', website: 'https://a.example', notes: '' }), { ok: true, body: {} });
  });

  it('the page uses the customers API, hides writes from read-only roles, and has a navigation entry for the reading roles', () => {
    const page = read('app/(workspace)/customers/page.tsx');
    assert.match(page, /apiFetch<CustomerRow\[\]>\('\/customers'\)/);
    assert.match(page, /canWriteCustomers\(role\)/);
    assert.match(page, /statusChoices\(role,/);
    const nav = read('src/navigation/navigation.ts');
    assert.match(nav, /href: '\/customers',\s*allowedRoles: \['OWNER', 'MANAGER', 'EMPLOYEE'\]/);
    assert.match(read('src/components/shell/sidebar.tsx'), /ids: \[[^\]]*'customers'/);
  });
});
