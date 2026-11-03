/**
 * Labour cost arithmetic (ADR-018; building blocks for MAOS-T73/T74).
 * Run: node --test test/labour-cost.test.mjs
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const lc = await import('../src/modules/finance/labour-cost.ts');
const r = (rateCents, validFrom) => ({ rateCents, validFrom, currency: 'EUR' });

describe('ADR-018 rate resolution', () => {
  const sources = {
    member: [r(5000, '2026-10-01')],
    role: [r(4000, '2026-01-01'), r(4200, '2026-07-01')],
    tenant: [r(3000, '2025-01-01')],
  };

  it('a member rate beats the role default, which beats the tenant default', () => {
    assert.deepEqual(lc.resolveRate(sources, '2026-10-13'), { rateCents: 5000, currency: 'EUR', rateSource: 'MEMBER' });
    assert.deepEqual(lc.resolveRate({ ...sources, member: [] }, '2026-10-13'), { rateCents: 4200, currency: 'EUR', rateSource: 'ROLE' });
    assert.deepEqual(lc.resolveRate({ tenant: sources.tenant }, '2026-10-13').rateSource, 'TENANT');
  });

  it('uses the rate in force on the entry date: an entry before a new rate keeps the old one', () => {
    assert.equal(lc.resolveRate(sources, '2026-09-30').rateSource, 'ROLE', 'member rate not yet valid');
    assert.equal(lc.resolveRate(sources, '2026-09-30').rateCents, 4200);
    assert.equal(lc.resolveRate(sources, '2026-06-30').rateCents, 4000);
    assert.equal(lc.resolveRate(sources, '2026-10-01').rateCents, 5000, 'valid from that day');
  });

  it('no applicable source means unrated (null), never 0', () => {
    assert.equal(lc.resolveRate({}, '2026-10-13'), null);
    assert.equal(lc.resolveRate({ member: [r(5000, '2027-01-01')] }, '2026-10-13'), null);
    assert.deepEqual(lc.resolveRate({ member: [r(0, '2026-01-01')] }, '2026-10-13').rateCents, 0, 'an explicit 0 rate is a rate');
  });

  it('rejects malformed dates and rates', () => {
    assert.throws(() => lc.resolveRate(sources, '13.10.2026'), RangeError);
    assert.throws(() => lc.resolveRate({ member: [r(10.5, '2026-01-01')] }, '2026-10-13'), RangeError);
    assert.throws(() => lc.resolveRate({ member: [r(-1, '2026-01-01')] }, '2026-10-13'), RangeError);
  });
});

describe('ADR-018 entry cost', () => {
  it('rounds half up in integer cents (ADR test cases)', () => {
    assert.equal(lc.entryCostCents(1, 3000), 50);
    assert.equal(lc.entryCostCents(7, 1999), 233);
    assert.equal(lc.entryCostCents(1, 30), 1, 'exactly half rounds up');
    assert.equal(lc.entryCostCents(1, 29), 0);
    assert.equal(lc.entryCostCents(1440, 100000), 2400000);
  });

  it('minutes are whole numbers from 1 to 1440', () => {
    for (const m of [0, -5, 1441, 1.5]) assert.throws(() => lc.entryCostCents(m, 1000), RangeError, String(m));
  });
});

describe('ADR-018 labour summary', () => {
  it('sums stored costs and reports unrated minutes separately, marking the result incomplete', () => {
    assert.deepEqual(
      lc.summariseLabour([
        { minutes: 60, costCents: 5000 },
        { minutes: 30, costCents: null },
        { minutes: 15, costCents: 1250 },
      ]),
      { ratedMinutes: 75, unratedMinutes: 30, costCents: 6250, incomplete: true },
    );
    assert.deepEqual(lc.summariseLabour([]), { ratedMinutes: 0, unratedMinutes: 0, costCents: 0, incomplete: false });
  });
});
