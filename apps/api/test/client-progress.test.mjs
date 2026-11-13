/**
 * D08 — the rules that turn task statuses into what a client may see:
 * four stages and their sum, nothing else. Pure, no database.
 * Prerequisite: `npm run build` (reads dist/).
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const { stageOf, countStages, emptyCounts } = require(join(apiRoot, 'dist/modules/client-portal/client-progress.js'));

describe('D08 — client progress rules', () => {
  it('maps every counted status to a client stage', () => {
    assert.equal(stageOf('TODO'), 'planned');
    assert.equal(stageOf('IN_PROGRESS'), 'inProgress');
    assert.equal(stageOf('IN_REVIEW'), 'inReview');
    assert.equal(stageOf('DONE'), 'done');
  });

  it('shows an internal blockage as in progress, never as its own stage', () => {
    assert.equal(stageOf('BLOCKED'), 'inProgress');
    const counts = countStages([{ status: 'BLOCKED', count: 2 }, { status: 'IN_PROGRESS', count: 1 }]);
    assert.deepEqual(counts, { total: 3, planned: 0, inProgress: 3, inReview: 0, done: 0 });
    assert.deepEqual(Object.keys(counts).sort(), ['done', 'inProgress', 'inReview', 'planned', 'total']);
  });

  it('does not count archived or unknown statuses', () => {
    assert.equal(stageOf('ARCHIVED'), null);
    assert.equal(stageOf('SOMETHING_NEW'), null);
    assert.deepEqual(countStages([{ status: 'ARCHIVED', count: 5 }, { status: 'SOMETHING_NEW', count: 4 }, { status: 'DONE', count: 1 }]),
      { total: 1, planned: 0, inProgress: 0, inReview: 0, done: 1 });
  });

  it('sums the stages into the total', () => {
    const counts = countStages([
      { status: 'TODO', count: 3 }, { status: 'IN_PROGRESS', count: 2 }, { status: 'IN_REVIEW', count: 1 }, { status: 'DONE', count: 4 },
    ]);
    assert.deepEqual(counts, { total: 10, planned: 3, inProgress: 2, inReview: 1, done: 4 });
    assert.equal(counts.planned + counts.inProgress + counts.inReview + counts.done, counts.total);
  });

  it('ignores rows without a positive whole count', () => {
    assert.deepEqual(countStages([{ status: 'DONE', count: 0 }, { status: 'DONE', count: -2 }, { status: 'TODO', count: 1.5 }, { status: 'TODO', count: NaN }]), emptyCounts());
  });

  it('an empty input is all zeros and a fresh object each time', () => {
    const a = countStages([]); const b = emptyCounts();
    assert.deepEqual(a, { total: 0, planned: 0, inProgress: 0, inReview: 0, done: 0 });
    a.total = 9;
    assert.equal(b.total, 0);
    assert.equal(emptyCounts().total, 0);
  });
});
