/**
 * Task due-date overdue flag: finished tasks are never overdue.
 * Run: node --test test/task-due.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { formatDueDate, isClosedStatus } from '../src/components/tasks/task-types.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const NOW = new Date('2026-10-29T12:00:00Z');
const PAST = '2026-10-20T12:00:00Z';
const YESTERDAY = '2026-10-28T12:00:00Z';
const FUTURE = '2026-11-05T12:00:00Z';
const OPEN = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED'];
const CLOSED = ['DONE', 'ARCHIVED'];

describe('formatDueDate overdue flag', () => {
  it('marks an unfinished task with a past due date as overdue', () => {
    for (const s of OPEN) assert.equal(formatDueDate(PAST, s, NOW).overdue, true, s);
  });

  it('never marks a DONE or ARCHIVED task as overdue, including "Yesterday"', () => {
    for (const s of CLOSED) {
      assert.equal(formatDueDate(PAST, s, NOW).overdue, false, s);
      const y = formatDueDate(YESTERDAY, s, NOW);
      assert.equal(y.label, 'Yesterday');
      assert.equal(y.overdue, false, `${s} yesterday`);
    }
  });

  it('keeps "Yesterday" overdue for unfinished work', () => {
    for (const s of OPEN) assert.equal(formatDueDate(YESTERDAY, s, NOW).overdue, true, s);
  });

  it('a future due date is never overdue, whatever the status', () => {
    for (const s of [...OPEN, ...CLOSED]) assert.equal(formatDueDate(FUTURE, s, NOW).overdue, false, s);
  });

  it('without a status a past date stays overdue (previous behaviour), and no date gives null', () => {
    assert.equal(formatDueDate(PAST, undefined, NOW).overdue, true);
    assert.equal(formatDueDate(null, 'TODO', NOW), null);
  });

  it('isClosedStatus covers exactly DONE and ARCHIVED', () => {
    for (const s of CLOSED) assert.equal(isClosedStatus(s), true, s);
    for (const s of OPEN) assert.equal(isClosedStatus(s), false, s);
  });
});

describe('every task view passes the status', () => {
  it('Kanban card, list view and task modal call formatDueDate with the status', () => {
    assert.match(read('src/components/tasks/task-card.tsx'), /formatDueDate\(task\.dueAt, task\.status\)/);
    assert.match(read('src/components/tasks/list-view.tsx'), /formatDueDate\(task\.dueAt, task\.status\)/);
    assert.match(read('src/components/tasks/task-modal.tsx'), /formatDueDate\([^;]*,\s*status\)/);
  });
});
