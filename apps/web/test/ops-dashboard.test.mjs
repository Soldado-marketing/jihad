/**
 * Operations-first dashboard (MAOS D7).
 * Run: node --test test/ops-dashboard.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  activeProjects,
  attention,
  canSeeFinance,
  financeKpis,
  nextTasks,
  upcoming,
  upcomingRange,
} from '../src/lib/ops-dashboard.ts';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const task = (id, dueAt) => ({ id, title: id, status: 'TODO', priority: 'MEDIUM', dueAt, project: null });
const work = (over = {}) => ({
  generatedAt: '2026-10-13T12:00:00Z',
  tasks: { overdue: [], dueSoon: [], blocked: [], open: [], ...over.tasks },
  approvals: { toDecide: [], requested: [], ...over.approvals },
  followUps: [],
  notifications: { unread: 0, latest: [] },
});

describe('ops dashboard view model', () => {
  it('leads with overdue work and decisions, then what is due and blocked', () => {
    const w = work({
      tasks: { overdue: [task('a', '2026-10-01T00:00:00Z')], dueSoon: [task('b'), task('c')], blocked: [] },
      approvals: { toDecide: [{ id: 'x', title: 'x', dueAt: null, createdAt: '2026-10-01T00:00:00Z' }] },
    });
    assert.deepEqual(
      attention(w).map((i) => [i.key, i.count, i.urgent]),
      [['overdue', 1, true], ['toDecide', 1, true], ['dueSoon', 2, false], ['blocked', 0, false]],
    );
  });

  it('lists overdue tasks oldest first, then due-soon nearest first, each once, capped', () => {
    const w = work({
      tasks: {
        overdue: [task('o2', '2026-10-10T00:00:00Z'), task('o1', '2026-10-01T00:00:00Z')],
        dueSoon: [task('s2', '2026-10-16T00:00:00Z'), task('o1', '2026-10-01T00:00:00Z'), task('s1', '2026-10-14T00:00:00Z')],
      },
    });
    assert.deepEqual(nextTasks(w).map((t) => t.id), ['o1', 'o2', 's1', 's2']);
    assert.deepEqual(nextTasks(w, 3).map((t) => t.id), ['o1', 'o2', 's1']);
  });

  it('asks the calendar for now until the end of day +7 (UTC)', () => {
    const r = upcomingRange(new Date('2026-10-13T12:34:00Z'));
    assert.equal(r.from, '2026-10-13T12:34:00.000Z');
    assert.equal(r.to, '2026-10-20T23:59:59.999Z');
  });

  it('shows only future, open items, soonest first', () => {
    const now = new Date('2026-10-13T12:00:00Z');
    const items = [
      { id: '1', type: 'task', title: 'later', at: '2026-10-15T00:00:00Z', status: 'TODO' },
      { id: '2', type: 'meeting', title: 'soon', at: '2026-10-13T15:00:00Z', status: 'SCHEDULED' },
      { id: '3', type: 'task', title: 'past', at: '2026-10-13T08:00:00Z', status: 'TODO' },
      { id: '4', type: 'invoice', title: 'paid', at: '2026-10-14T00:00:00Z', status: 'PAID' },
      { id: '5', type: 'meeting', title: 'cancelled', at: '2026-10-14T00:00:00Z', status: 'CANCELED' },
      { id: '6', type: 'task', title: 'done', at: '2026-10-14T00:00:00Z', status: 'DONE' },
    ];
    assert.deepEqual(upcoming(items, now).map((i) => i.id), ['2', '1']);
  });

  it('active projects only, most recently updated first, with the true total', () => {
    const p = (id, status, updatedAt) => ({ id, name: id, status, updatedAt });
    const r = activeProjects(
      [p('a', 'ACTIVE', '2026-10-01T00:00:00Z'), p('b', 'PAUSED', '2026-10-12T00:00:00Z'), p('c', 'ACTIVE', '2026-10-11T00:00:00Z'), p('d', 'ACTIVE', '2026-10-05T00:00:00Z')],
      2,
    );
    assert.deepEqual(r.shown.map((x) => x.id), ['c', 'd']);
    assert.equal(r.total, 3);
  });

  it('finance KPIs stay in integer cents and outstanding never goes negative', () => {
    const base = { totalRevenueCents: 50000, totalCostCents: 20000, currency: 'EUR', marginCents: 30000, marginPercent: 60 };
    assert.equal(financeKpis({ ...base, totalInvoicedCents: 100001, totalPaidCents: 40000 }).outstandingCents, 60001);
    assert.equal(financeKpis({ ...base, totalInvoicedCents: 100, totalPaidCents: 150 }).outstandingCents, 0);
  });

  it('only the OWNER asks for finance', () => {
    assert.deepEqual(['OWNER', 'MANAGER', 'EMPLOYEE', 'CONTRACTOR', 'CLIENT', undefined].map(canSeeFinance), [true, false, false, false, false, false]);
  });

  it('every workspace navigation item has a sidebar slot', () => {
    // The sidebar renders only ids listed in its groups; My Work, Calendar and
    // the audit log were in the navigation but had no slot, so no menu entry.
    const sidebar = read('src/components/shell/sidebar.tsx');
    const grouped = [...sidebar.matchAll(/ids: \[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));
    const nav = read('src/navigation/navigation.ts');
    const block = nav.slice(nav.indexOf('workspaceNavigation'));
    // Deferred placeholders (sprint2Status: 'deferred') are hidden on purpose.
    const ids = [...block.matchAll(/id: '([^']+)'[\s\S]*?sprint2Status: '(\w+)'/g)].filter((m) => m[2] !== 'deferred').map((m) => m[1]);
    assert.ok(ids.length > 5);
    assert.deepEqual(ids.filter((id) => !grouped.includes(id)), []);
  });

  it('the dashboard requests finance only for the OWNER, through a separate component', () => {
    const page = read('app/(workspace)/dashboard/page.tsx');
    assert.match(page, /if \(canSeeFinance\(u\?\.role\)\) \{\s*setShowFinance\(true\);/);
    assert.match(page, /\{showFinance && <OwnerFinanceKpis \/>\}/);
    // The page itself never touches finance data (sprint-10 baseline); the
    // OWNER-only component does, and hides itself if the API refuses.
    assert.doesNotMatch(page, /finance\/summary/);
    const finance = read('src/components/dashboard/owner-finance-kpis.tsx');
    assert.match(finance, /apiFetch<FinanceSummary>\('\/finance\/summary'\)/);
    assert.match(finance, /catch\(\(\) => setState\('hidden'\)\)/);
    assert.match(page, /\/my-work/);
    assert.match(page, /\/calendar\?/);
  });
});

function read(p) {
  return readFileSync(join(webRoot, p), 'utf8');
}
