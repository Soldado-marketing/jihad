/**
 * G10 — bulk actions on tasks: selection, the requests an action needs, and the result sentence.
 * Run: node --test test/bulk-tasks.test.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { bulkQuestion, bulkResult, planBulk, selectionState, shownSelection, toggleAllShown, toggleSelected } from '../src/lib/bulk-tasks.ts';
import { activityLabel } from '../src/lib/activity.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const task = (id, over = {}) => ({ id, status: 'TODO', assignedToUserId: null, projectId: null, labels: [], ...over });
const twenty = Array.from({ length: 20 }, (_, i) => task(`t${i + 1}`));

describe('G10 — selecting tasks', () => {
  it('a task is selected and unselected one by one, without touching the set it started from', () => {
    const none = new Set();
    const one = toggleSelected(none, 'a');
    assert.deepEqual([...one], ['a']);
    assert.deepEqual([...toggleSelected(one, 'b')].sort(), ['a', 'b']);
    assert.deepEqual([...toggleSelected(one, 'a')], []);
    assert.equal(none.size, 0);
  });

  it('the header box selects everything shown, and clears when everything shown is selected', () => {
    const shown = ['a', 'b', 'c'];
    assert.equal(selectionState(new Set(), shown), 'none');
    assert.equal(selectionState(new Set(['b']), shown), 'some');
    assert.equal(selectionState(new Set(shown), shown), 'all');
    assert.equal(selectionState(new Set(), []), 'none', 'an empty list is never "all selected"');
    assert.deepEqual([...toggleAllShown(new Set(['b']), shown)], shown);
    assert.deepEqual([...toggleAllShown(new Set(shown), shown)], []);
  });

  it('the selection is cut down to what is shown, in the order shown: a task a filter has hidden is not acted on', () => {
    const selected = new Set(['hidden-1', 'c', 'a', 'hidden-2']);
    assert.deepEqual(shownSelection(selected, ['a', 'b', 'c']), ['a', 'c']);
    assert.deepEqual(shownSelection(selected, []), []);
    assert.equal(selectionState(selected, ['a', 'c']), 'all', 'hidden tasks do not count');
  });
});

describe('G10 — the requests an action needs', () => {
  it('twenty tasks, one action: twenty single-task requests on the routes the editor uses', () => {
    const status = planBulk({ kind: 'status', status: 'DONE' }, twenty);
    assert.equal(status.requests.length, 20);
    assert.equal(status.unchanged, 0);
    assert.deepEqual(status.requests[0], { taskId: 't1', method: 'PATCH', path: '/tasks/t1', body: { status: 'DONE' } });
    assert.deepEqual(planBulk({ kind: 'assign', userId: 'u1' }, twenty).requests[19], { taskId: 't20', method: 'PATCH', path: '/tasks/t20', body: { assignedToUserId: 'u1' } });
    assert.deepEqual(planBulk({ kind: 'move', projectId: 'p1' }, twenty).requests[4], { taskId: 't5', method: 'PATCH', path: '/tasks/t5', body: { projectId: 'p1' } });
    assert.deepEqual(planBulk({ kind: 'label', labelId: 'l1' }, twenty).requests[2], { taskId: 't3', method: 'POST', path: '/tasks/t3/labels/l1' });
  });

  it('a task already in the chosen state gets no request, so nothing is recorded for it', () => {
    const mixed = [
      task('a', { status: 'DONE', assignedToUserId: 'u1', projectId: 'p1', labels: [{ label: { id: 'l1' } }] }),
      task('b'),
      task('c', { labels: [{ label: { id: 'other' } }] }),
    ];
    for (const action of [{ kind: 'status', status: 'DONE' }, { kind: 'assign', userId: 'u1' }, { kind: 'move', projectId: 'p1' }, { kind: 'label', labelId: 'l1' }]) {
      const plan = planBulk(action, mixed);
      assert.deepEqual(plan.requests.map((r) => r.taskId), ['b', 'c'], action.kind);
      assert.equal(plan.unchanged, 1, action.kind);
    }
    assert.deepEqual(planBulk({ kind: 'status', status: 'TODO' }, [task('x')]), { requests: [], unchanged: 1 });
  });

  it('ids are put into the path safely', () => {
    assert.equal(planBulk({ kind: 'label', labelId: 'l/1' }, [task('t 1')]).requests[0].path, '/tasks/t%201/labels/l%2F1');
  });
});

describe('G10 — the question and the result', () => {
  it('asks in plain words what will change and for how many tasks', () => {
    assert.equal(bulkQuestion({ kind: 'status', status: 'DONE' }, 20, 'Done'), 'Set 20 tasks to “Done”?');
    assert.equal(bulkQuestion({ kind: 'assign', userId: 'u' }, 1, 'Ana Maria'), 'Assign 1 task to Ana Maria?');
    assert.equal(bulkQuestion({ kind: 'move', projectId: 'p' }, 20, 'Spring film'), 'Move 20 tasks to the project “Spring film”?');
    assert.equal(bulkQuestion({ kind: 'label', labelId: 'l' }, 3, 'urgent'), 'Add the label “urgent” to 3 tasks?');
  });

  it('says how many were changed, how many were already set, and how many failed and why', () => {
    assert.equal(bulkResult(20, 0, []), '20 tasks changed.');
    assert.equal(bulkResult(1, 0, []), '1 task changed.');
    assert.equal(bulkResult(18, 2, []), '18 tasks changed. 2 were already set.');
    assert.equal(bulkResult(19, 1, []), '19 tasks changed. 1 was already set.');
    assert.equal(bulkResult(0, 20, []), 'Nothing to change: all 20 tasks were already set.');
    assert.equal(bulkResult(0, 1, []), 'Nothing to change: the task was already set.');
    assert.equal(
      bulkResult(19, 0, ['Something went wrong on our side. Please try again in a moment.']),
      '19 of 20 tasks changed. 1 could not be changed and is still selected. Something went wrong on our side. Please try again in a moment.',
    );
    assert.equal(
      bulkResult(17, 1, ['Task not found', 'Task not found']),
      '17 of 20 tasks changed. 2 could not be changed and are still selected. Task not found',
      'the same reason is said once',
    );
    assert.equal(bulkResult(0, 0, ['']), '0 of 1 task changed. 1 could not be changed and is still selected.');
  });

  it('a label change reads as a sentence in the card history', () => {
    assert.equal(activityLabel('task.label.added'), 'Label added');
    assert.equal(activityLabel('task.label.removed'), 'Label removed');
  });
});

describe('G10 — how the page uses it', () => {
  const bar = readFileSync(join(root, 'src/components/tasks/bulk-bar.tsx'), 'utf8');
  const page = readFileSync(join(root, 'app/(workspace)/tasks/page.tsx'), 'utf8');

  it('the bar sends only what the plan says, one request after the other', () => {
    assert.match(bar, /planBulk\(pending\.action, tasks\)/);
    assert.match(bar, /for \(const request of requests\) \{[\s\S]*?await apiFetch\(request\.path/);
    assert.ok(!/Promise\.all/.test(bar), 'no burst of parallel requests');
    assert.ok(!/tasks\/bulk|\/bulk['"`]/.test(bar), 'no bulk route: the editor\'s single-task routes');
  });

  it('nothing changes before the question is answered', () => {
    const apply = bar.slice(bar.indexOf('async function apply'), bar.indexOf('const memberName'));
    const choose = bar.slice(bar.indexOf('function choose'), bar.indexOf('async function apply'));
    assert.ok(!choose.includes('apiFetch'), 'choosing an action sends nothing');
    assert.ok(apply.includes('apiFetch'));
    assert.match(bar, /onClick=\{\(\) => void apply\(\)\}/);
  });

  it('the page acts on shown tasks only and keeps the failed ones selected', () => {
    assert.match(page, /shownSelection\(selected, shownIds\)/);
    assert.match(page, /if \(failedIds\.length > 0\) setSelected\(new Set\(failedIds\)\)/);
  });
});
