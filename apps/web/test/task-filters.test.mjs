/**
 * Task board filters and view in the URL (UX C2): they survive a reload and
 * a shared link restores them.
 * Run: node --test test/task-filters.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { register } from 'node:module';

// task-filters.ts imports '../../lib/filters' the way Next resolves it; Node's
// type stripping needs the extension, so this test-only hook adds it for
// extensionless relative imports.
register(
  'data:text/javascript,export async function resolve(s, c, next) { try { return await next(s, c); } catch (e) { if (s.startsWith(".") && !/\\.[cm]?[jt]s$/.test(s)) return next(s + ".ts", c); throw e; } }',
  import.meta.url,
);
const { clearTaskFilters, filterTasks, hasTaskFilters, readTaskFilters, taskFilterDefinitions, writeTaskFilters } =
  await import('../src/components/tasks/task-filters.ts');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const page = readFileSync(join(root, 'app/(workspace)/tasks/page.tsx'), 'utf8');

const members = [{ id: 'u1', email: 'a@example.test', displayName: 'Ana' }, { id: 'u2', email: 'b@example.test', displayName: null }];
const projects = [{ id: 'p1', name: 'Website' }, { id: 'p2', name: 'Launch' }];
const defs = taskFilterDefinitions(members, projects);
const read = (qs) => readTaskFilters(new URLSearchParams(qs), defs);
const NONE = { search: '', status: '', priority: '', assignee: '', project: '', view: 'kanban' };

describe('reading the board state from the URL', () => {
  it('restores search, status, priority, assignee, project and view from a shared link', () => {
    assert.deepEqual(read('q=logo&status=BLOCKED&priority=HIGH&assignee=u2&project=p1&view=list'), {
      search: 'logo', status: 'BLOCKED', priority: 'HIGH', assignee: 'u2', project: 'p1', view: 'list',
    });
  });

  it('an empty URL is the default board', () => {
    assert.deepEqual(read(''), NONE);
  });

  it('ignores values that are not allowed, including ids the viewer cannot see', () => {
    assert.deepEqual(read('status=HACKED&priority=x&assignee=someone-else&project=p9&view=gantt'), NONE);
  });

  it('caps and trims the search text', () => {
    assert.equal(read(`q=${'  a'.padEnd(150, 'b')}`).search.length, 100);
    assert.equal(read('q=%20%20logo%20').search, 'logo');
  });
});

describe('writing the board state to the URL', () => {
  it('round-trips every filter and the view', () => {
    const state = { search: 'Müller logo', status: 'IN_REVIEW', priority: 'URGENT', assignee: 'u1', project: 'p2', view: 'calendar' };
    assert.deepEqual(read(writeTaskFilters(new URLSearchParams(), state, defs)), state);
  });

  it('keeps the default view and empty filters out of the URL', () => {
    assert.equal(writeTaskFilters(new URLSearchParams(), NONE, defs), '');
    assert.equal(writeTaskFilters(new URLSearchParams(), { ...NONE, status: 'TODO' }, defs), 'status=TODO');
  });

  it('keeps unrelated params and drops a cleared filter', () => {
    const qs = writeTaskFilters(new URLSearchParams('ref=mail&status=TODO&q=old'), { ...NONE, search: 'new' }, defs);
    assert.equal(qs, 'ref=mail&q=new');
  });

  it('clearing the filters keeps the selected view', () => {
    const cleared = clearTaskFilters({ search: 'x', status: 'DONE', priority: 'LOW', assignee: 'u1', project: 'p1', view: 'list' });
    assert.deepEqual(cleared, { ...NONE, view: 'list' });
    assert.equal(hasTaskFilters(cleared), false);
    assert.equal(writeTaskFilters(new URLSearchParams(), cleared, defs), 'view=list');
  });
});

describe('filtering the loaded tasks', () => {
  const tasks = [
    { id: 't1', title: 'Design logo', status: 'BLOCKED', priority: 'HIGH', assignedToUserId: 'u1', projectId: 'p1' },
    { id: 't2', title: 'Write copy', status: 'TODO', priority: 'LOW', assignedToUserId: 'u2', projectId: 'p1' },
    { id: 't3', title: 'Logo variants', status: 'DONE', priority: null, assignedToUserId: null, projectId: 'p2' },
  ];
  const ids = (f) => filterTasks(tasks, { ...NONE, ...f }).map((t) => t.id);

  it('applies every filter together, search is case-insensitive on the title', () => {
    assert.deepEqual(ids({}), ['t1', 't2', 't3']);
    assert.deepEqual(ids({ search: 'LOGO' }), ['t1', 't3']);
    assert.deepEqual(ids({ search: 'logo', project: 'p1' }), ['t1']);
    assert.deepEqual(ids({ status: 'BLOCKED', priority: 'HIGH', assignee: 'u1' }), ['t1']);
    assert.deepEqual(ids({ assignee: 'u2', status: 'DONE' }), []);
  });

  it('the view does not change which tasks are shown', () => {
    assert.deepEqual(ids({ view: 'list' }), ids({}));
  });
});

describe('the tasks page keeps its state in the URL', () => {
  it('reads filters and view from the URL instead of local state', () => {
    assert.match(page, /useSearchParams\(\)/);
    assert.match(page, /readTaskFilters\(/);
    assert.match(page, /const view = filters\.view;/);
    for (const old of ['setFilterStatus', 'setFilterPriority', 'setFilterAssignee', 'setFilterProject', 'setView(']) {
      assert.ok(!page.includes(old), `${old} keeps the state out of the URL`);
    }
  });

  it('replaces the URL (no history entry per keystroke) and debounces the search box', () => {
    assert.match(page, /router\.replace\(qs \? `\$\{pathname\}\?\$\{qs\}` : pathname, \{ scroll: false \}\)/);
    assert.match(page, /setTimeout\(\(\) => commit\(\{ \.\.\.latest\.current, search \}\), 250\)/);
    assert.doesNotMatch(page, /router\.push/);
  });

  it('wraps the board in a Suspense boundary for useSearchParams', () => {
    assert.match(page, /<Suspense fallback=[\s\S]*<TasksBoard \/>[\s\S]*<\/Suspense>/);
  });

  it('keeps Kanban drag-and-drop, quick create, List and Calendar wired up', () => {
    assert.match(page, /<KanbanBoard[\s\S]*tasks=\{filteredTasks\}[\s\S]*onStatusChange=\{handleStatusChange\}[\s\S]*onQuickCreate=\{handleQuickCreate\}/);
    assert.match(page, /<ListView tasks=\{filteredTasks\}/);
    assert.match(page, /view === 'calendar' && <CalendarView \/>/);
  });
});
