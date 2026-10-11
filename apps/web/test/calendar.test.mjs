/**
 * Calendar date logic and wiring (MAOS-T104).
 * Run: node --test test/calendar.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dayKey, groupByDay, itemHref, monthGrid, rangeFor, shiftAnchor, startOfWeek } from '../src/lib/calendar.ts';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (p) => readFileSync(join(webRoot, p), 'utf8');
const d = (s) => new Date(s);

describe('calendar dates (UTC, Monday weeks)', () => {
  it('finds the Monday of a week', () => {
    assert.equal(dayKey(startOfWeek(d('2026-10-11T23:30:00Z'))), '2026-10-05'); // Sunday -> previous Monday
    assert.equal(dayKey(startOfWeek(d('2026-10-12T00:00:00Z'))), '2026-10-12'); // Monday
  });

  it('builds a 6x7 month grid starting on the Monday on or before the 1st', () => {
    const grid = monthGrid(d('2026-11-15T12:00:00Z'));
    assert.equal(grid.length, 42);
    assert.equal(dayKey(grid[0]), '2026-10-26'); // 1 Nov 2026 is a Sunday
    assert.equal(dayKey(grid[41]), '2026-12-06');
  });

  it('requests at most 42 days for a month and 7 for a week (API limit 62)', () => {
    const m = rangeFor('month', d('2026-11-15T00:00:00Z'));
    assert.equal((m.to - m.from) / 86400000, 42);
    const w = rangeFor('week', d('2026-11-15T00:00:00Z'));
    assert.equal((w.to - w.from) / 86400000, 7);
    assert.equal(dayKey(w.from), '2026-11-09');
  });

  it('steps by month or week, across a year boundary', () => {
    assert.equal(dayKey(shiftAnchor('month', d('2026-12-20T00:00:00Z'), 1)), '2027-01-01');
    assert.equal(dayKey(shiftAnchor('week', d('2026-12-31T00:00:00Z'), -1)), '2026-12-21');
  });

  it('groups items by their UTC day', () => {
    const map = groupByDay([{ at: '2026-11-10T00:00:00.000Z' }, { at: '2026-11-10T22:00:00.000Z' }, { at: '2026-11-11T08:00:00.000Z' }]);
    assert.equal(map.get('2026-11-10').length, 2);
    assert.equal(map.get('2026-11-11').length, 1);
  });

  it('links each type to its own page', () => {
    assert.equal(itemHref({ id: 'x', type: 'task' }), '/tasks/x');
    assert.equal(itemHref({ id: 'x', type: 'invoice' }), '/finance/invoices/x');
    assert.equal(itemHref({ id: 'x', type: 'unknown' }), '#');
  });
});

describe('calendar wiring', () => {
  it('replaces the tasks placeholder and offers a workspace calendar for internal roles', () => {
    const tasksView = read('src/components/tasks/calendar-view.tsx');
    assert.doesNotMatch(tasksView, /Coming in a future sprint/);
    assert.match(tasksView, /<AgencyCalendar types=\{TASK_TYPES\} \/>/);
    assert.match(read('src/components/calendar/agency-calendar.tsx'), /apiFetch<\{ items: CalendarItem\[\] \}>\(`\/calendar\?/);
    const nav = read('src/navigation/navigation.ts');
    const entry = nav.slice(nav.indexOf("id: 'calendar'"), nav.indexOf("id: 'calendar'") + 240);
    assert.doesNotMatch(entry, /CLIENT/);
  });
});
