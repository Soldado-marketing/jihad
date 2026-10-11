/**
 * Approval queue (MAOS-T108).
 * Run: node --test test/approval-queue.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { isOverdue, splitQueue, waitingText } from '../src/lib/approval-queue.ts';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const a = (id, status, dueAt, createdAt, decisions) => ({ id, title: id, status, dueAt, createdAt, decisions });

describe('approval queue', () => {
  const items = [
    a('undated-new', 'REQUESTED', null, '2026-10-10T00:00:00Z'),
    a('due-later', 'REQUESTED', '2026-10-20T00:00:00Z', '2026-10-01T00:00:00Z'),
    a('overdue', 'CHANGES_REQUESTED', '2026-10-05T00:00:00Z', '2026-10-02T00:00:00Z'),
    a('undated-old', 'REQUESTED', null, '2026-09-01T00:00:00Z'),
    a('approved', 'APPROVED', null, '2026-09-01T00:00:00Z', [{ id: 'd1', decision: 'APPROVE', createdAt: '2026-10-09T00:00:00Z' }]),
    a('rejected', 'REJECTED', null, '2026-09-01T00:00:00Z', [{ id: 'd2', decision: 'REJECT', createdAt: '2026-10-11T00:00:00Z' }]),
  ];

  it('puts overdue first, then nearest due date, then undated oldest first', () => {
    assert.deepEqual(splitQueue(items).waiting.map((x) => x.id), ['overdue', 'due-later', 'undated-old', 'undated-new']);
  });

  it('lists decided approvals newest decision first', () => {
    assert.deepEqual(splitQueue(items).decided.map((x) => x.id), ['rejected', 'approved']);
  });

  it('recognises overdue items and describes waiting time', () => {
    const now = new Date('2026-10-11T12:00:00Z');
    assert.equal(isOverdue(items[2], now), true);
    assert.equal(isOverdue(items[0], now), false);
    assert.equal(waitingText('2026-10-11T08:00:00Z', now), 'Waiting since today');
    assert.equal(waitingText('2026-10-10T08:00:00Z', now), 'Waiting 1 day');
    assert.equal(waitingText('2026-10-01T08:00:00Z', now), 'Waiting 10 days');
  });

  it('the page shows titles, decides in the shared panel and reloads after a conflict', () => {
    const page = readFileSync(join(webRoot, 'app/(workspace)/approvals/page.tsx'), 'utf8');
    assert.doesNotMatch(page, /Approval #\{a\.id/);
    assert.match(page, /<DetailPanel/);
    assert.match(page, /\/approvals\/\$\{selected\.id\}\/decision/);
    assert.match(page, /setDecideError\([\s\S]*?await load\(\)/);
  });
});
