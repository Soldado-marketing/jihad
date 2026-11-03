/**
 * Custom project board lists in the web app (owner approval 2026-10-29):
 * card placement, who sees the list controls, and the board saving every
 * change through the API without writing anything on open.
 * Run: node --test test/board-lists.test.mjs
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { register } from 'node:module';

// board-lists.ts imports './board-order' the way Next resolves it; Node's type
// stripping needs the extension, so this test-only hook adds it.
register(
  'data:text/javascript,export async function resolve(s, c, next) { try { return await next(s, c); } catch (e) { if (s.startsWith(".") && !/\\.[cm]?[jt]s$/.test(s)) return next(s + ".ts", c); throw e; } }',
  import.meta.url,
);
const { UNLISTED, activeLists, canManageLists, placeCards } = await import('../src/components/tasks/board-lists.ts');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const board = read('src/components/tasks/project-board.tsx');

const list = (id, sortOrder, status = null, archivedAt = null) => ({ id, projectId: 'p', name: id, sortOrder, status, archivedAt });
const task = (id, over = {}) => ({ id, status: 'TODO', listId: null, sortOrder: null, ...over });
const ids = (groups, key) => (groups.get(key) ?? []).map((t) => t.id);

describe('placing cards in custom lists', () => {
  const lists = [list('edit', 2000), list('todo', 1000, 'TODO'), list('done', 3000, 'DONE'), list('old', 4000, null, '2026-10-01')];

  it('orders active lists and leaves archived ones out', () => {
    assert.deepEqual(activeLists(lists).map((l) => l.id), ['todo', 'edit', 'done']);
  });

  it('a card shows in its own list, by position', () => {
    const g = placeCards([task('b', { listId: 'edit', sortOrder: 2000 }), task('a', { listId: 'edit', sortOrder: 1000 })], lists);
    assert.deepEqual(ids(g, 'edit'), ['a', 'b']);
  });

  it('a card without a list (existing tasks) shows in the list mapped to its status', () => {
    const g = placeCards([task('t1'), task('t2', { status: 'DONE' })], lists);
    assert.deepEqual(ids(g, 'todo'), ['t1']);
    assert.deepEqual(ids(g, 'done'), ['t2']);
  });

  it('a card with no matching list is "not in a list"; archived ones stay off the board', () => {
    const g = placeCards([task('r', { status: 'IN_REVIEW' }), task('gone', { listId: 'old' }), task('arch', { status: 'ARCHIVED' })], lists);
    assert.deepEqual(ids(g, UNLISTED), ['r']);
    assert.ok(![...g.values()].flat().some((t) => t.id === 'gone' || t.id === 'arch'));
  });

  it('a list mapped to no status keeps the card\'s status (custom workflow)', () => {
    const g = placeCards([task('x', { listId: 'edit', status: 'IN_PROGRESS' })], lists);
    assert.deepEqual(ids(g, 'edit'), ['x']);
  });
});

describe('the project board', () => {
  it('only OWNER and MANAGER see list controls (the API enforces it too)', () => {
    assert.deepEqual(['OWNER', 'MANAGER', 'EMPLOYEE', 'CONTRACTOR', 'CLIENT', undefined].map(canManageLists), [true, true, false, false, false, false]);
    assert.match(board, /\{manage && \(/);
  });

  it('reads on open and sets up lists only on the explicit action', () => {
    assert.match(board, /apiFetch<BoardList\[\]>\(`\/projects\/\$\{projectId\}\/lists\?includeArchived=true`\)/);
    assert.match(board, /const initialize = \(\) => run\(\(\) => apiFetch\(`\/projects\/\$\{projectId\}\/lists\/initialize`, \{ method: 'POST' \}\)\);/);
    assert.equal((board.match(/lists\/initialize/g) ?? []).length, 1);
    assert.match(board, /onClick=\{\(\) => void initialize\(\)\}/);
  });

  it('saves create, rename, reorder, archive and restore', () => {
    assert.match(board, /apiFetch\(`\/projects\/\$\{projectId\}\/lists`, \{ method: 'POST'/);
    assert.match(board, /patchList\(list\.id, \{ name \}\)/);
    assert.match(board, /`\/projects\/\$\{projectId\}\/lists\/reorder`, \{ method: 'PATCH'/);
    assert.match(board, /patchList\(list\.id, \{ archived: true \}\)/);
    assert.match(board, /patchList\(l\.id, \{ archived: false \}\)/);
  });

  it('moves a card with its position; only the moved card changes list', () => {
    assert.match(board, /reorderItems\(ordered\)\.map\(\(item\) => \(item\.id === id \? \{ \.\.\.item, listId: list\.id \} : item\)\)/);
    assert.match(board, /apiFetch\('\/tasks\/reorder', \{ method: 'PATCH', body: JSON\.stringify\(\{ items \}\) \}\)/);
  });

  it('adds cards to any list, in the project, at the end', () => {
    assert.match(board, /JSON\.stringify\(\{ title, projectId, \.\.\.\(list\.status \? \{ status: list\.status \} : \{\}\) \}\)/);
    assert.match(board, /listId: list\.id \}\] \}\)/);
  });

  it('opens cards in the existing task modal (checklist, labels, files, comments, activity)', () => {
    assert.match(board, /<TaskModal/);
  });

  it('the fictional-data prototype is gone', () => {
    assert.equal(existsSync(join(root, 'src/components/tasks/board-prototype.tsx')), false);
    assert.equal(existsSync(join(root, 'app/(workspace)/prototype')), false);
  });
});
