/**
 * Customer 360 UI (MAOS-T55) over the permission-filtered overview (T54).
 * Run: node --test test/customer-360.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { fileSize, kpis, progressText, tabsFor } from '../src/lib/customer-360.ts';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (p) => readFileSync(join(webRoot, p), 'utf8');
const page = read('app/(workspace)/customers/[id]/page.tsx');

const full = {
  sections: ['projects', 'tasks', 'files', 'approvals', 'invoices', 'finance'],
  projects: { total: 3, items: [] },
  tasks: { byStatus: { TODO: 2, IN_PROGRESS: 1, DONE: 4, ARCHIVED: 1 }, upcoming: [] },
  files: { total: 7, recent: [] },
  approvals: { byStatus: { REQUESTED: 1, CHANGES_REQUESTED: 1, APPROVED: 5 }, open: [] },
  invoices: { byStatus: { SENT: 1, OVERDUE: 1, PAID: 3, DRAFT: 2 }, recent: [] },
  finance: { totals: [], recentPayments: [] },
};

describe('customer 360 UI', () => {
  it('shows tabs only for sections the API sent', () => {
    assert.deepEqual(tabsFor(full), ['overview', 'projects', 'files', 'notes']);
    assert.deepEqual(tabsFor({ sections: ['tasks', 'approvals'] }), ['overview', 'notes']);
  });

  it('counts open work per section and never invents a missing section', () => {
    assert.deepEqual(
      kpis(full).map((k) => [k.key, k.value]),
      [['projects', 3], ['openTasks', 3], ['openApprovals', 2], ['files', 7], ['openInvoices', 2]],
    );
    const employee = { sections: ['projects', 'tasks'], projects: { total: 1, items: [] }, tasks: { byStatus: {}, upcoming: [] } };
    assert.deepEqual(kpis(employee).map((k) => k.key), ['projects', 'openTasks']);
  });

  it('formats progress and sizes', () => {
    assert.equal(progressText({ done: 1, total: 4, percent: 25 }), '25% · 1/4');
    assert.equal(progressText({ done: 0, total: 0, percent: null }), 'No tasks');
    assert.deepEqual([fileSize(null), fileSize(512), fileSize(2048), fileSize(5 * 1024 * 1024)], ['—', '512 B', '2 KB', '5.0 MB']);
  });

  it('renders money only from the finance section and project budgets the API sent', () => {
    assert.match(page, /\{data\.finance && \(/, 'finance block guarded by the section');
    assert.match(page, /\{p\.budgetCents !== undefined && \(/, 'budget cell only when the API sent a budget');
    assert.match(page, /<span className="text-xs text-muted">\{p\.status\}<\/span>/, 'status always shown, never replaced by the budget');
    assert.ok(!/totalCents|amountCents/.test(page), 'no invoice or payment amounts; money only via finance totals');
    assert.match(page, /\{tab === 'projects' && data\.projects && \(/);
    assert.match(page, /\{tab === 'files' && data\.files && \(/);
  });

  it('renders the activity heading once (the timeline owns it)', () => {
    assert.ok(!/>Activity<\/h2>/.test(page));
  });

  it('uses the one overview read, the customer timeline and links from the list', () => {
    assert.match(page, /apiFetch<CustomerOverview>\(`\/customers\/\$\{id\}\/overview`\)/);
    assert.match(page, /<ActivityTimeline resourceType="customer"/);
    assert.match(read('app/(workspace)/customers/page.tsx'), /href=\{`\/customers\/\$\{c\.id\}`\}/);
    assert.match(read('src/components/ui/activity-timeline.tsx'), /\| 'customer'/);
  });
});
