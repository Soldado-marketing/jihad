/**
 * D07 — the pure part of the customer history (dist/modules/customers/customer-history.js):
 * query validation, the (time, id) order, the per-source cursor condition and
 * the page merge. The paging walk below feeds the same cursor condition the
 * service hands to the database, so "every entry exactly once" is asserted on
 * the real rule, including many entries that share one timestamp.
 *
 * Run: node --test test/customer-history.test.mjs (after `npm run build`).
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const {
  HISTORY_DEFAULT_LIMIT, HISTORY_MAX_LIMIT, EXCERPT_LENGTH, SOURCE,
  parseHistoryQuery, excerpt, compareEntries, afterCursor, pageHistory, entryId, encodeCursor,
} = require(join(apiRoot, 'dist/modules/customers/customer-history.js'));

const T0 = Date.parse('2026-11-01T10:00:00.000Z');
const entry = (prefix, rowId, ms) => ({ id: entryId(prefix, rowId), at: new Date(ms), kind: 'delivery', event: 'sent', title: rowId, ref: { type: 'file', id: rowId } });

/** What the database does with the condition `afterCursor` returns, for one row. */
function matches(where, row, column) {
  if (!Object.keys(where).length) return true;
  if (where.OR) return where.OR.some((w) => matches(w, row, column));
  const c = where[column];
  const t = row[column].getTime();
  if (c instanceof Date) return t === c.getTime() && (where.id ? row.id < where.id.lt : true);
  if (c.lt) return t < c.lt.getTime();
  if (c.lte) return t <= c.lte.getTime();
  throw new Error('unexpected condition');
}
/** One page as the service builds it: each source returns its newest `limit + 1` rows after the cursor. */
function page(sources, limit, before) {
  const q = parseHistoryQuery(String(limit), before);
  assert.equal(q.ok, true, before);
  const fetched = Object.entries(sources).flatMap(([prefix, rows]) =>
    rows
      .filter((r) => matches(afterCursor(prefix, 'at', q.cursor), r, 'at'))
      .sort((a, b) => b.at - a.at || (a.id < b.id ? 1 : -1))
      .slice(0, limit + 1)
      .map((r) => entry(prefix, r.id, r.at.getTime())),
  );
  return pageHistory(fetched, limit);
}
function walk(sources, limit) {
  const seen = [];
  let before;
  for (let i = 0; i < 500; i += 1) {
    const p = page(sources, limit, before);
    seen.push(...p.items);
    if (!p.nextBefore) return seen;
    before = p.nextBefore;
  }
  throw new Error('paging did not end');
}

describe('D07 — history query validation', () => {
  it('defaults and bounds of limit', () => {
    assert.deepEqual(parseHistoryQuery(), { ok: true, limit: HISTORY_DEFAULT_LIMIT, cursor: null });
    assert.equal(parseHistoryQuery('1').limit, 1);
    assert.equal(parseHistoryQuery(String(HISTORY_MAX_LIMIT)).limit, HISTORY_MAX_LIMIT);
    for (const bad of ['0', String(HISTORY_MAX_LIMIT + 1), '-1', '1.5', 'abc', '', ' 5', '1e2', '0005000']) {
      assert.deepEqual(parseHistoryQuery(bad), { ok: false, code: 'INVALID_LIMIT' }, `limit "${bad}"`);
    }
  });

  it('a cursor is an exact ISO instant plus a known entry id; anything else is refused', () => {
    const good = `2026-11-01T10:00:00.000Z|${SOURCE.decision}:cmw123abc`;
    const q = parseHistoryQuery(undefined, good);
    assert.equal(q.ok, true);
    assert.deepEqual(q.cursor, { at: new Date('2026-11-01T10:00:00.000Z'), prefix: SOURCE.decision, rowId: 'cmw123abc' });
    for (const bad of [
      '', '|', 'yesterday|a:x', '2026-11-01|a:x', '2026-11-01T10:00:00Z|a:x', '2026-11-01T10:00:00.000Z', '2026-11-01T10:00:00.000Z|',
      '2026-11-01T10:00:00.000Z|z:x', '2026-11-01T10:00:00.000Z|a-x', '2026-11-01T10:00:00.000Z|a:', '2026-11-01T10:00:00.000Z|a:x y',
      "2026-11-01T10:00:00.000Z|a:x' OR 1=1", `2026-11-01T10:00:00.000Z|a:${'x'.repeat(65)}`,
    ]) {
      assert.deepEqual(parseHistoryQuery(undefined, bad), { ok: false, code: 'INVALID_BEFORE' }, `before "${bad}"`);
    }
  });

  it('a cursor round-trips through encodeCursor', () => {
    const e = entry(SOURCE.message, 'row_1-A', T0 + 1);
    const q = parseHistoryQuery(undefined, encodeCursor(e));
    assert.deepEqual(q.cursor, { at: e.at, prefix: SOURCE.message, rowId: 'row_1-A' });
  });
});

describe('D07 — excerpt', () => {
  it('collapses whitespace, bounds the length, and returns nothing for empty text', () => {
    assert.equal(excerpt('  hello \n  world  '), 'hello world');
    assert.equal(excerpt(''), undefined);
    assert.equal(excerpt('   '), undefined);
    assert.equal(excerpt(null), undefined);
    const long = excerpt('x'.repeat(EXCERPT_LENGTH * 3));
    assert.equal(long.length, EXCERPT_LENGTH);
    assert.ok(long.endsWith('…'));
    assert.equal(excerpt('y'.repeat(EXCERPT_LENGTH)).length, EXCERPT_LENGTH);
  });
});

describe('D07 — order and paging', () => {
  it('orders by time descending, then by id descending', () => {
    const list = [entry('a', 'x', T0), entry('b', 'x', T0), entry('a', 'y', T0), entry('h', 'q', T0 - 1), entry('a', 'z', T0 + 5)];
    assert.deepEqual([...list].sort(compareEntries).map((e) => e.id), ['a:z', 'b:x', 'a:y', 'a:x', 'h:q']);
  });

  it('pageHistory cuts at the limit and names the last entry as the cursor only when more remain', () => {
    const list = [entry('a', '1', T0), entry('a', '2', T0 + 1), entry('a', '3', T0 + 2)];
    const first = pageHistory(list, 2);
    assert.deepEqual(first.items.map((e) => e.id), ['a:3', 'a:2']);
    assert.equal(first.nextBefore, `${new Date(T0 + 1).toISOString()}|a:2`);
    assert.equal(pageHistory(list, 3).nextBefore, null);
    assert.deepEqual(pageHistory([], 5), { items: [], nextBefore: null });
  });

  it('the cursor condition per source: earlier prefixes still owe the cursor instant, later ones do not', () => {
    const cursor = { at: new Date(T0), prefix: 'd', rowId: 'm5' };
    assert.deepEqual(afterCursor('a', 'createdAt', null), {});
    assert.deepEqual(afterCursor('a', 'createdAt', cursor), { createdAt: { lte: cursor.at } });
    assert.deepEqual(afterCursor('h', 'dueAt', cursor), { dueAt: { lt: cursor.at } });
    assert.deepEqual(afterCursor('d', 'createdAt', cursor), { OR: [{ createdAt: { lt: cursor.at } }, { createdAt: cursor.at, id: { lt: 'm5' } }] });
  });

  it('walking the pages returns every entry exactly once, in order, for any page size', () => {
    const rows = (n, step, offset = 0) => Array.from({ length: n }, (_, i) => ({ id: `r${String(i).padStart(3, '0')}`, at: new Date(T0 - i * step + offset) }));
    const sources = { a: rows(23, 60_000), b: rows(17, 45_000, 7), d: rows(31, 30_000), f: rows(5, 600_000), h: rows(9, 90_000, -3) };
    const all = Object.entries(sources).flatMap(([p, rs]) => rs.map((r) => entry(p, r.id, r.at.getTime()))).sort(compareEntries).map((e) => e.id);
    for (const limit of [1, 2, 3, 7, 10, 50, 100]) {
      assert.deepEqual(walk(sources, limit).map((e) => e.id), all, `limit ${limit}`);
    }
  });

  it('many entries on one timestamp, within one source and across sources, are neither dropped nor repeated', () => {
    const same = (n) => Array.from({ length: n }, (_, i) => ({ id: `s${String(i).padStart(3, '0')}`, at: new Date(T0) }));
    const sources = {
      a: [...same(40), { id: 'older', at: new Date(T0 - 1) }, { id: 'newer', at: new Date(T0 + 1) }],
      d: same(25),
      f: same(130), // e.g. imported invoices that all carry the same instant
      h: [{ id: 'only', at: new Date(T0) }],
    };
    const all = Object.entries(sources).flatMap(([p, rs]) => rs.map((r) => entry(p, r.id, r.at.getTime()))).sort(compareEntries).map((e) => e.id);
    assert.equal(all.length, 198);
    for (const limit of [1, 3, 10, 50, 100]) {
      const got = walk(sources, limit).map((e) => e.id);
      assert.equal(new Set(got).size, got.length, `no repeat at limit ${limit}`);
      assert.deepEqual(got, all, `complete and ordered at limit ${limit}`);
    }
  });
});
