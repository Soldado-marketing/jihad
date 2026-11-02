/**
 * Client Portal V2 (owner decision 2026-11-02): four sections, notices that
 * open their record inside the client area, appointments the client confirms,
 * and invoices with their payments. The API enforces scope; this keeps the UI
 * on the client's own routes.
 * Run: node --test test/client-portal-v2.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { notificationHref } from '../src/lib/notifications.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

describe('client portal v2', () => {
  it('has four sections: Overview, My Work, Invoices, Appointments', () => {
    const hrefs = [...read('src/navigation/client-navigation.ts').matchAll(/href: '([^']+)'/g)].map((m) => m[1]);
    assert.deepEqual(hrefs, ['/client', '/client/deliveries', '/client/invoices', '/client/appointments']);
  });

  it('opens each client notice inside the client area, never an internal page', () => {
    assert.equal(notificationHref('delivery', 'd1', 'client'), '/client/deliveries/d1');
    assert.equal(notificationHref('invoice', 'i1', 'client'), '/client/invoices/i1');
    assert.equal(notificationHref('appointment', 'a1', 'client'), '/client/appointments#appointment-a1');
    assert.equal(notificationHref('complaint', 'c1', 'client'), '/client/problems/c1');
    assert.equal(notificationHref('complaint', 'c1', 'workspace'), '/complaints?open=c1');
    for (const type of ['file', 'approval', 'task', 'project', 'time-entry', null]) assert.equal(notificationHref(type, 'x', 'client'), null, String(type));
    assert.equal(notificationHref('approval', 'r1', 'workspace'), '/approvals?open=r1');
    const bell = read('src/components/notifications/notification-bell.tsx');
    assert.match(bell, /portal === 'client' \? '\/client\/notifications' : '\/notifications'/);
    assert.match(read('src/components/client-portal/client-topbar.tsx'), /<NotificationBell portal="client" \/>/);
  });

  it('uses only client routes for appointments and the overview', () => {
    const appointments = read('app/(client)/client/appointments/page.tsx');
    assert.match(appointments, /'\/client\/appointments'/);
    assert.match(appointments, /`\/client\/appointments\/\$\{id\}\/seen`/);
    const overview = read('src/components/dashboard/client-dashboard-summary.tsx');
    const paths = [...overview.matchAll(/apiFetch<[^>]+>\('([^']+)'\)/g)].map((m) => m[1]).sort();
    assert.deepEqual(paths, ['/client/appointments', '/client/deliveries', '/client/invoices', '/client/problems']);
  });

  it('"Report a problem" goes to management and is separate from a revision request', () => {
    const problems = read('app/(client)/client/problems/page.tsx');
    assert.match(problems, /apiFetch\('\/client\/problems', \{\s*method: 'POST'/);
    assert.match(problems, /Report a problem/);
    assert.match(read('app/(client)/client/deliveries/[id]/page.tsx'), /\/client\/problems\?delivery=/);
    const nav = read('src/navigation/navigation.ts');
    assert.match(nav, /id: 'complaints',\s*label: 'Problem reports',\s*href: '\/complaints',\s*allowedRoles: \['OWNER', 'MANAGER'\]/);
    const staff = read('app/(workspace)/complaints/page.tsx');
    assert.match(staff, /internal/);
    assert.match(staff, /\/complaints\/\$\{selected\.id\}\/\$\{path\}/);
  });

  it('shows the same paid total as the API: every payment except failed, refunded or cancelled', () => {
    const lib = read('src/lib/client-portal.ts');
    assert.match(lib, /UNCOUNTED_PAYMENT = new Set\(\['FAILED', 'REFUNDED', 'CANCELED'\]\)/);
    assert.match(read('../api/src/modules/invoices/invoice-totals.ts'), /UNCOUNTED_PAYMENT_STATUSES = \['FAILED', 'REFUNDED', 'CANCELED'\]/);
    assert.match(read('app/(client)/client/invoices/[id]/page.tsx'), /filter\(\(p\) => countedPayment\(p\.status\)\)/);
  });

  it('opens shared links safely and only accepts https links from staff', () => {
    const detail = read('app/(client)/client/deliveries/[id]/page.tsx');
    assert.match(detail, /\^URL=\(https:\\\/\\\/\\S\+\)/);
    assert.match(detail, /target="_blank" rel="noopener noreferrer"/);
    assert.match(read('src/components/files/file-uploader.tsx'), /url\.protocol !== 'https:'/);
  });
});
