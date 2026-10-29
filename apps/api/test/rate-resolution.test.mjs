/**
 * Rate resolution and cost (MAOS-T73, ADR-018; F-6: one module, finance/labour-cost.ts).
 * Run: node --test test/rate-resolution.test.mjs
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { costCents, pickRate, scopeKeyFor } from '../src/modules/finance/labour-cost.ts';

const day = (s) => new Date(`${s}T00:00:00.000Z`);
const rate = (scope, key, rateCents, validFrom) => ({ scope, scopeKey: key, rateCents, currency: 'EUR', validFrom: day(validFrom) });

describe('costCents', () => {
  it('is round_half_up(minutes x rate / 60), matching the database check', () => {
    for (const [m, r, c] of [[60, 3000, 3000], [1, 3000, 50], [7, 1999, 233], [1, 30, 1], [1, 29, 0], [1, 90, 2], [1, 89, 1], [1440, 0, 0], [1440, 89478485, 2147483640]]) {
      assert.equal(costCents(m, r), c, `${m} x ${r}`);
      assert.equal(costCents(m, r), Number((BigInt(m) * BigInt(r) + 30n) / 60n), 'same as the bigint SQL expression');
    }
  });
});

describe('pickRate', () => {
  const rates = [
    rate('TENANT', 'TENANT', 3000, '2026-01-01'),
    rate('TENANT', 'TENANT', 3500, '2026-05-01'),
    rate('ROLE', 'ROLE:EMPLOYEE', 4000, '2026-01-01'),
    rate('ROLE', 'ROLE:MANAGER', 9000, '2026-01-01'),
    rate('MEMBER', 'MEMBER:u1', 6000, '2026-06-01'),
    rate('MEMBER', 'MEMBER:u2', 7000, '2026-01-01'),
  ];
  it('member beats role beats tenant', () => {
    assert.deepEqual(pickRate(rates, day('2026-07-01'), 'u1', 'EMPLOYEE'), { rateCents: 6000, rateSource: 'MEMBER', currency: 'EUR' });
    assert.deepEqual(pickRate(rates, day('2026-03-01'), 'u1', 'EMPLOYEE'), { rateCents: 4000, rateSource: 'ROLE', currency: 'EUR' });
    assert.deepEqual(pickRate(rates, day('2026-03-01'), 'u3', 'CONTRACTOR'), { rateCents: 3000, rateSource: 'TENANT', currency: 'EUR' });
  });
  it('uses the newest validFrom on or before the entry day', () => {
    assert.equal(pickRate(rates, day('2026-04-30'), 'u3', 'CONTRACTOR').rateCents, 3000);
    assert.equal(pickRate(rates, day('2026-05-01'), 'u3', 'CONTRACTOR').rateCents, 3500, 'effective on its first day');
    assert.equal(pickRate(rates, day('2026-05-31'), 'u1', 'EMPLOYEE').rateSource, 'ROLE', 'member rate not yet valid');
  });
  it('never takes another member or role, and is unrated without a source', () => {
    assert.equal(pickRate(rates, day('2026-03-01'), 'u1', 'EMPLOYEE').rateCents, 4000, 'u2 member rate ignored');
    assert.equal(pickRate(rates, day('2025-12-31'), 'u1', 'EMPLOYEE'), null);
    assert.equal(pickRate([], day('2026-03-01'), 'u1', 'EMPLOYEE'), null);
  });
  it('builds the unique-key targets', () => {
    assert.deepEqual([scopeKeyFor('TENANT'), scopeKeyFor('ROLE', null, 'MANAGER'), scopeKeyFor('MEMBER', 'u1')], ['TENANT', 'ROLE:MANAGER', 'MEMBER:u1']);
  });
});
