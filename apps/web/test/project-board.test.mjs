/**
 * Trello-style board on the existing task model: card order within a list
 * persists (Task.sortOrder via PATCH /tasks/reorder), every project opens its
 * own board, and a card shows its real history.
 * Run: node --test test/project-board.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ORDER_STEP, dropIndex, moveCard, reorderItems, sortByOrder } from '../src/components/tasks/board-order.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const board = read('src/components/tasks/kanban-board.tsx');
const page = read('app/(workspace)/tasks/page.tsx');

describe('card order within a list', () => {
  it('moves a card to the drop position, inside or across lists', () => {
    assert.deepEqual(moveCard(['a', 'b', 'c'], 'c', 0), ['c', 'a', 'b']);
    assert.deepEqual(moveCard(['a', 'b', 'c'], 'a', 2), ['b', 'c', 'a']);
    assert.deepEqual(moveCard(['a', 'b'], 'x', 1), ['a', 'x', 'b'], 'a card from another list is inserted');
    assert.deepEqual(moveCard(['a', 'b'], 'x', 99), ['a', 'b', 'x']);
    assert.deepEqual(moveCard([], 'x', -3), ['x']);
  });

  it('finds the drop index from the other cards\' midpoints', () => {
    assert.equal(dropIndex([100, 200, 300], 50), 0);
    assert.equal(dropIndex([100, 200, 300], 150), 1);
    assert.equal(dropIndex([100, 200, 300], 999), 3);
    assert.equal(dropIndex([], 10), 0);
  });

  it('saves evenly spaced sortOrder values, top to bottom', () => {
    assert.deepEqual(reorderItems(['c', 'a']), [{ id: 'c', sortOrder: ORDER_STEP }, { id: 'a', sortOrder: 2 * ORDER_STEP }]);
  });

  it('sorts like the API: by sortOrder, unordered cards last, otherwise stable', () => {
    const tasks = [{ id: 'n1', sortOrder: null }, { id: 'b', sortOrder: 2000 }, { id: 'n2' }, { id: 'a', sortOrder: 1000 }];
    assert.deepEqual(sortByOrder(tasks).map((t) => t.id), ['a', 'b', 'n1', 'n2']);
  });
});

describe('the board persists drops through the existing reorder endpoint', () => {
  it('drops at a position, also inside the same list', () => {
    assert.match(read('src/components/tasks/task-card.tsx'), /data-task-card=\{task\.id\}/);
    assert.match(board, /const index = dropIndex\(/);
    assert.match(board, /const ordered = moveCard\(listIds, taskId, index\);/);
    assert.match(board, /if \(task\.status !== status\) await onStatusChange\(taskId, status\);\s+if \(onReorder\) await onReorder\(status, ordered\);/);
    assert.doesNotMatch(board, /task\.status === status\) return;/, 'a same-list drop is no longer ignored');
  });

  it('saves optimistically, then PATCH /tasks/reorder, and reloads on failure', () => {
    assert.match(page, /async function handleReorder\(status: TaskStatus, orderedIds: string\[\]\)/);
    assert.match(page, /apiFetch\('\/tasks\/reorder', \{ method: 'PATCH', body: JSON\.stringify\(\{ items \}\) \}\)/);
    assert.match(page, /onReorder=\{handleReorder\}/);
  });
});

describe('every project has its own board', () => {
  it('the project page opens the project\'s own list board', () => {
    assert.match(read('app/(workspace)/projects/[id]/page.tsx'), /href=\{`\/projects\/\$\{encodeURIComponent\(project\.id\)\}\/board`\}[\s\S]*Open board/);
    assert.match(read('app/(workspace)/projects/[id]/board/page.tsx'), /<ProjectBoard projectId=\{id\} \/>/);
  });

  it('a card added on the status board filtered to a project belongs to that project', () => {
    assert.match(page, /JSON\.stringify\(\{ title, status, \.\.\.\(filters\.project \? \{ projectId: filters\.project \} : \{\}\) \}\)/);
  });

  it('the board is titled with the project when filtered to it', () => {
    assert.match(page, /const boardProject = projects\.find\(\(p\) => p\.id === filters\.project\) \?\? null;/);
    assert.match(page, /title=\{boardProject \? boardProject\.name : 'Task Board'\}/);
  });
});

describe('card history', () => {
  it('shows the real audit timeline instead of created/updated dates', () => {
    const modal = read('src/components/tasks/task-modal.tsx');
    assert.match(modal, /<ActivityTimeline resourceType="task" resourceId=\{task\.id\} \/>/);
    assert.doesNotMatch(modal, /Last updated/);
  });

  it('names the task events', () => {
    const labels = read('src/lib/activity.ts');
    for (const action of ['task.created', 'task.status.changed', 'task.assigned', 'task.updated', 'task.deleted']) {
      assert.ok(labels.includes(`'${action}'`), action);
    }
  });
});
