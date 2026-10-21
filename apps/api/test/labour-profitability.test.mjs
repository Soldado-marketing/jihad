/**
 * Labour in project profitability (MAOS-T74, ADR-018 §6) - pure arithmetic.
 * Run: node --test test/labour-profitability.test.mjs
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildProjectProfitability } from '../src/modules/finance/profitability.ts';

const m = (entries) => new Map(entries);

describe('project profitability with stored labour', () => {
  it('cost = recorded + labour; margin and percent follow; minutes reported', () => {
    const [row] = buildProjectProfitability(
      m([['p1', { name: 'P1', cents: 100000 }]]),
      m([['p1', { name: 'P1', cents: 20000 }]]),
      m([['p1', { name: 'P1', costCents: 9000, ratedMinutes: 90, unratedMinutes: 0 }]]),
    );
    assert.deepEqual(row, {
      projectId: 'p1', projectName: 'P1', revenueCents: 100000, costCents: 29000, marginCents: 71000, marginPercent: 71,
      recordedCostCents: 20000, labourCostCents: 9000, ratedMinutes: 90, unratedMinutes: 0, incomplete: false,
    });
  });

  it('unrated minutes make the result incomplete and are never priced', () => {
    const [row] = buildProjectProfitability(m([['p1', { name: 'P1', cents: 1000 }]]), m(), m([['p1', { name: 'P1', costCents: 0, ratedMinutes: 0, unratedMinutes: 45 }]]));
    assert.deepEqual([row.costCents, row.labourCostCents, row.unratedMinutes, row.incomplete, row.marginCents], [0, 0, 45, true, 1000]);
  });

  it('a project with labour only appears, worst margin first', () => {
    const rows = buildProjectProfitability(
      m([['p1', { name: 'P1', cents: 5000 }]]),
      m(),
      m([['p2', { name: 'P2', costCents: 7000, ratedMinutes: 70, unratedMinutes: 0 }]]),
    );
    assert.deepEqual(rows.map((r) => [r.projectId, r.projectName, r.marginCents, r.marginPercent]), [['p2', 'P2', -7000, null], ['p1', 'P1', 5000, 100]]);
  });

  it('without labour the result is the Phase 4 result plus zero labour fields', () => {
    const [row] = buildProjectProfitability(m([['p1', { name: 'P1', cents: 300 }]]), m([['p1', { name: 'P1', cents: 100 }]]));
    assert.deepEqual([row.costCents, row.marginCents, row.recordedCostCents, row.labourCostCents, row.incomplete], [100, 200, 100, 0, false]);
  });
});

describe('customer profitability (MAOS-T75)', () => {
  it('sums revenue, recorded cost and stored labour per customer; unrated stays apart', async () => {
    const { buildCustomerProfitability } = await import('../src/modules/finance/profitability.ts');
    const rows = buildCustomerProfitability([
      { customerId: 'c1', customerName: 'Acme', revenueCents: 100000 },
      { customerId: 'c1', customerName: 'Acme', recordedCostCents: 20000 },
      { customerId: 'c1', customerName: 'Acme', labourCostCents: 9000, ratedMinutes: 90, unratedMinutes: 0 },
      { customerId: 'c1', customerName: 'Acme', labourCostCents: 0, ratedMinutes: 0, unratedMinutes: 30 },
      { customerId: 'c2', customerName: 'Beta', labourCostCents: 5000, ratedMinutes: 50, unratedMinutes: 0 },
      { customerId: null, customerName: null, revenueCents: 700, recordedCostCents: 100 },
    ]);
    assert.deepEqual(rows.map((r) => [r.customerId, r.revenueCents, r.recordedCostCents, r.labourCostCents, r.costCents, r.marginCents, r.marginPercent, r.unratedMinutes, r.incomplete]), [
      ['c2', 0, 0, 5000, 5000, -5000, null, 0, false],
      ['c1', 100000, 20000, 9000, 29000, 71000, 71, 30, true],
      [null, 700, 100, 0, 100, 600, 85.7, 0, false],
    ]);
    const sum = (k) => rows.reduce((n, r) => n + r[k], 0);
    assert.deepEqual([sum('revenueCents'), sum('costCents')], [100700, 34100], 'rows add up to the workspace totals');
  });
});
