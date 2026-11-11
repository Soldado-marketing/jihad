/**
 * Customer history tab (D07) over GET /customers/:id/history.
 * Run: node --test test/customer-history.test.mjs
 */
// Times are shown where the reader is; the tests fix that place.
process.env.TZ = 'Europe/Berlin';

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { offersHistory, tabsFor } from '../src/lib/customer-360.ts';
import {
  KIND_LABEL, appendPage, dayOf, entryAmount, entryHref, entryLabel, filterByKind, groupByDay, historyPath, kindsIn, timeOf,
} from '../src/lib/customer-history.ts';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (p) => readFileSync(join(webRoot, p), 'utf8');
const component = read('src/components/customers/customer-history.tsx');
const page = read('app/(workspace)/customers/[id]/page.tsx');
const lib = read('src/lib/customer-history.ts');

const e = (over) => ({ id: 'a:1', at: '2026-11-05T09:30:00.000Z', kind: 'delivery', event: 'sent', title: 'Logo film', ref: { type: 'file', id: 'f1' }, ...over });

describe('customer history tab', () => {
  it('is offered only when the overview shows a source the caller may read', () => {
    assert.equal(offersHistory(['projects', 'files']), false);
    for (const s of ['approvals', 'tasks', 'invoices']) assert.equal(offersHistory([s]), true, s);
    assert.deepEqual(tabsFor({ sections: ['projects', 'tasks', 'files', 'approvals', 'invoices', 'finance'] }), ['overview', 'projects', 'files', 'history', 'notes']);
    assert.deepEqual(tabsFor({ sections: ['projects', 'files'] }), ['overview', 'projects', 'files', 'notes']);
    assert.deepEqual(tabsFor({ sections: [] }), ['overview', 'notes']);
  });

  it('builds the request path and encodes the cursor', () => {
    assert.equal(historyPath('c1'), '/customers/c1/history');
    assert.equal(historyPath('c1', null), '/customers/c1/history');
    assert.equal(historyPath('c1', '2026-11-05T09:30:00.000Z|b:x1'), '/customers/c1/history?before=2026-11-05T09%3A30%3A00.000Z%7Cb%3Ax1');
  });

  it('says what happened in one plain sentence per entry', () => {
    assert.equal(entryLabel(e({ meta: { version: 2 } })), 'Sent to the client for review (version 2)');
    assert.equal(entryLabel(e({ event: 'approved', from: 'client' })), 'Approved by the client');
    assert.equal(entryLabel(e({ event: 'changes_requested', from: 'client', meta: { version: 1 } })), 'The client asked for changes (version 1)');
    assert.equal(entryLabel(e({ event: 'replied', from: 'company' })), 'The company replied and sent a new version');
    assert.equal(entryLabel(e({ kind: 'problem', event: 'opened' })), 'The client reported a problem');
    assert.equal(entryLabel(e({ kind: 'request', event: 'opened' })), 'The client requested new work');
    assert.equal(entryLabel(e({ kind: 'problem', event: 'message', from: 'client' })), 'Message from the client');
    assert.equal(entryLabel(e({ kind: 'problem', event: 'message', from: 'company' })), 'Answer to the client');
    assert.equal(entryLabel(e({ kind: 'problem', event: 'message', from: 'company', internal: true })), 'Note for management');
    assert.equal(entryLabel(e({ kind: 'problem', event: 'resolved' })), 'Problem report resolved');
    assert.equal(entryLabel(e({ kind: 'request', event: 'reopened', from: 'client' })), 'Work request reopened by the client');
    assert.equal(entryLabel(e({ kind: 'problem', event: 'reopened', from: 'company' })), 'Problem report reopened by the company');
    assert.equal(entryLabel(e({ kind: 'invoice', event: 'invoice' })), 'Invoice created');
    assert.equal(entryLabel(e({ kind: 'payment', event: 'payment' })), 'Payment recorded');
    assert.equal(entryLabel(e({ kind: 'appointment', event: 'appointment' })), 'Shooting appointment');
  });

  it('links each entry to its record', () => {
    assert.equal(entryHref(e({})), '/files/f1');
    assert.equal(entryHref(e({ ref: { type: 'invoice', id: 'i1' } })), '/finance/invoices/i1');
    assert.equal(entryHref(e({ ref: { type: 'task', id: 't1' } })), '/tasks/t1');
    assert.equal(entryHref(e({ ref: { type: 'request', id: 'r1' } })), '/requests');
    assert.equal(entryHref(e({ ref: { type: 'problem', id: 'p1' } })), '/complaints');
  });

  it('shows an amount only when the API sent one, in integer cents', () => {
    assert.equal(entryAmount(e({})), null);
    assert.equal(entryAmount(e({ meta: { issuedAt: null } })), null);
    assert.deepEqual(entryAmount(e({ meta: { totalCents: 10000, currency: 'EUR' } })), { cents: 10000, currency: 'EUR' });
    assert.deepEqual(entryAmount(e({ meta: { amountCents: 2500, currency: 'CHF' } })), { cents: 2500, currency: 'CHF' });
    assert.deepEqual(entryAmount(e({ meta: { totalCents: 0 } })), { cents: 0, currency: 'EUR' });
  });

  it('filters by kind and lists only the kinds present, in a fixed order', () => {
    const items = [e({ id: '1', kind: 'payment' }), e({ id: '2', kind: 'delivery' }), e({ id: '3', kind: 'problem' }), e({ id: '4', kind: 'delivery' })];
    assert.deepEqual(kindsIn(items), ['delivery', 'problem', 'payment']);
    assert.deepEqual(kindsIn([]), []);
    assert.deepEqual(filterByKind(items, 'delivery').map((x) => x.id), ['2', '4']);
    assert.deepEqual(filterByKind(items, 'all').map((x) => x.id), ['1', '2', '3', '4']);
    assert.deepEqual(filterByKind(items, 'invoice'), []);
    for (const k of ['delivery', 'request', 'problem', 'appointment', 'invoice', 'payment']) assert.ok(KIND_LABEL[k]);
  });

  it('groups by the reader\'s calendar day without reordering, and appends a page without repeating an entry', () => {
    // Berlin is one hour ahead of UTC in November: 23:30 UTC is already the next day there.
    const items = [e({ id: '1', at: '2026-11-05T09:30:00.000Z' }), e({ id: '2', at: '2026-11-04T23:30:00.000Z' }), e({ id: '3', at: '2026-11-04T22:59:00.000Z' })];
    assert.deepEqual(groupByDay(items).map((g) => [g.day, g.items.map((x) => x.id)]), [['2026-11-05', ['1', '2']], ['2026-11-04', ['3']]]);
    assert.deepEqual(groupByDay([]), []);
    assert.equal(timeOf('2026-11-05T09:30:00.000Z'), '10:30');
    assert.equal(dayOf('2026-11-04T23:30:00.000Z'), '2026-11-05');
    assert.equal(timeOf('2026-07-01T12:05:00.000Z'), '14:05', 'summer time');
    assert.deepEqual(appendPage(items, [e({ id: '3' }), e({ id: '4' })]).map((x) => x.id), ['1', '2', '3', '4']);
  });

  it('the tab component: loading, error with retry, empty, filter, internal mark, link, load more; nothing stored in the browser', () => {
    assert.match(component, /role="status">Loading the history/);
    assert.match(component, /<ErrorState title="The history could not be loaded" message=\{error\} onRetry=\{first\}/);
    assert.match(component, /Nothing has happened with this customer yet\./);
    assert.match(component, /aria-pressed=\{kind === k\}/);
    assert.match(component, /e\.internal && <span[^>]*>Internal note<\/span>/);
    assert.match(component, /<Link href=\{entryHref\(e\)\}/);
    assert.match(component, /Load more/);
    assert.match(component, /break-words/, 'long titles and notes wrap instead of widening the page');
    assert.doesNotMatch(component, /localStorage|sessionStorage|dangerouslySetInnerHTML/);
    assert.doesNotMatch(lib, /^import /m, 'the helpers stay loadable on their own');
  });

  it('the customer page renders the tab through the component and lets the tab row scroll on a narrow screen', () => {
    assert.match(page, /history: 'History'/);
    assert.match(page, /tab === 'history' && \(\s*<div role="tabpanel">\s*<CustomerHistory customerId=\{id\} \/>/);
    assert.match(page, /role="tablist"[^>]*overflow-x-auto/);
  });
});
