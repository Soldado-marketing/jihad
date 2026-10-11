/**
 * My Work page (MAOS-T68).
 * Run: node --test test/my-work.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dueText, summarizeMyWork } from '../src/lib/my-work.ts';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (p) => readFileSync(join(webRoot, p), 'utf8');
const empty = () => ({
  generatedAt: '2026-10-11T00:00:00Z',
  tasks: { overdue: [], dueSoon: [], blocked: [], open: [] },
  approvals: { toDecide: [], requested: [] },
  followUps: [],
  notifications: { unread: 0, latest: [] },
});

describe('my work summary', () => {
  it('counts the attention items and recognises an empty day', () => {
    assert.deepEqual(summarizeMyWork(empty()), { counts: { overdue: 0, dueSoon: 0, blocked: 0, toDecide: 0 }, nothing: true });
    const w = empty();
    w.tasks.overdue.push({ id: '1' });
    w.approvals.toDecide.push({ id: 'a' }, { id: 'b' });
    const s = summarizeMyWork(w);
    assert.deepEqual(s.counts, { overdue: 1, dueSoon: 0, blocked: 0, toDecide: 2 });
    assert.equal(s.nothing, false);
  });

  it('is not empty while unread notifications or open tasks remain', () => {
    const w = empty();
    w.notifications.unread = 1;
    assert.equal(summarizeMyWork(w).nothing, false);
  });

  it('describes due dates', () => {
    const now = new Date('2026-10-11T12:00:00Z');
    assert.equal(dueText(null, now), 'No due date');
    assert.equal(dueText('2026-10-09T00:00:00Z', now), 'Overdue since 9 Oct');
    assert.equal(dueText('2026-10-14T00:00:00Z', now), 'Due 14 Oct');
  });
});

describe('my work page', () => {
  it('reads /my-work, offers a retry and is in the navigation for internal roles only', () => {
    const page = read('app/(workspace)/my-work/page.tsx');
    assert.match(page, /apiFetch<MyWork>\('\/my-work'\)/);
    assert.match(page, /<ErrorState/);
    const nav = read('src/navigation/navigation.ts');
    const entry = nav.slice(nav.indexOf("id: 'my-work'"), nav.indexOf("id: 'my-work'") + 260);
    assert.match(entry, /href: '\/my-work'/);
    assert.doesNotMatch(entry, /CLIENT/);
    assert.match(entry, /clientSafe: false/);
  });
});
