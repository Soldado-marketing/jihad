/**
 * Kanban columns and layout: every active status has a column (Blocked
 * included) and every column stays reachable on desktop and mobile.
 * Run: node --test test/kanban-columns.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { COLUMNS, STATUS_META } from '../src/components/tasks/task-types.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const board = readFileSync(join(root, 'src/components/tasks/kanban-board.tsx'), 'utf8');

describe('Kanban columns', () => {
  it('has one column for every task status except ARCHIVED, BLOCKED included', () => {
    const statuses = COLUMNS.map((c) => c.status);
    const expected = Object.keys(STATUS_META).filter((s) => s !== 'ARCHIVED');
    assert.deepEqual([...statuses].sort(), [...expected].sort());
    assert.ok(statuses.includes('BLOCKED'), 'blocked tasks would be invisible on the board');
    assert.equal(new Set(statuses).size, statuses.length, 'duplicate column');
  });

  it('keeps the established order and Done last', () => {
    assert.deepEqual(COLUMNS.map((c) => c.status), ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE']);
  });
});

describe('Kanban layout keeps every column reachable', () => {
  it('uses one grid track per column that shares the width and scrolls when it does not fit', () => {
    assert.match(board, /grid-flow-col/);
    assert.match(board, /sm:auto-cols-\[minmax\(15rem,1fr\)\]/);
    assert.match(board, /xl:auto-cols-\[minmax\(12\.5rem,1fr\)\]/, 'all five columns must fit on a 1440px screen');
    assert.match(board, /overflow-x-auto/);
    assert.doesNotMatch(board, /shrink-0 w-72/, 'fixed-width columns pushed the last column off-screen');
  });

  it('snaps to columns on phones (one column per swipe)', () => {
    assert.match(board, /auto-cols-\[85vw\]/);
    assert.match(board, /snap-x snap-mandatory/);
    assert.match(board, /snap-start/);
  });

  it('offers a jump bar to every column and a keyboard-scrollable board region', () => {
    assert.match(board, /aria-label="Board columns"/);
    assert.match(board, /showColumn\(col\.status\)/);
    assert.match(board, /board\.scrollTo\(\{ left: column\.offsetLeft \}\)/);
    assert.match(board, /className="relative grid/, 'the board must be the offset parent of its columns');
    assert.match(board, /role="region"[\s\S]*aria-label="Task board"[\s\S]*tabIndex=\{0\}/);
  });

  it('keeps drag-and-drop and quick create on every column', () => {
    for (const handler of ['onDragOver', 'onDragLeave', 'onDrop', 'onDragEnd', 'onStatusChange', 'onQuickCreate']) {
      assert.match(board, new RegExp(handler), handler);
    }
  });
});
