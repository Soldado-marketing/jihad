/**
 * Project status in the client portal (D08) over GET /client/progress.
 * Run: node --test test/client-progress.test.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { STAGES, forProject, percentDone, progressSummary, projectChoices, projectStateLabel } from '../src/lib/client-progress.ts';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (p) => readFileSync(join(webRoot, p), 'utf8');
const component = read('src/components/client-portal/client-project-progress.tsx');
const page = read('app/(client)/client/deliveries/page.tsx');
const lib = read('src/lib/client-progress.ts');

const steps = (planned, inProgress, inReview, done) => ({ total: planned + inProgress + inReview + done, planned, inProgress, inReview, done });
const project = (id, name, s = steps(0, 0, 0, 0), status = 'ACTIVE') => ({ id, name, status, steps: s });

describe('client project status — wording', () => {
  it('names four stages in the client\'s words, in working order', () => {
    assert.deepEqual(STAGES, [
      { key: 'planned', label: 'Planned' }, { key: 'inProgress', label: 'In progress' },
      { key: 'inReview', label: 'In review' }, { key: 'done', label: 'Done' },
    ]);
  });

  it('gives a project state in plain words and keeps an unknown one readable', () => {
    assert.equal(projectStateLabel('ACTIVE'), 'In progress');
    assert.equal(projectStateLabel('PAUSED'), 'Paused');
    assert.equal(projectStateLabel('ARCHIVED'), 'Completed');
    assert.equal(projectStateLabel('NEW_STATE'), 'NEW_STATE');
  });

  it('writes one sentence for every situation', () => {
    assert.equal(progressSummary(steps(2, 2, 1, 3)), '3 of 8 work steps done');
    assert.equal(progressSummary(steps(0, 0, 0, 0)), 'No work steps have been shared yet.');
    assert.equal(progressSummary(steps(0, 0, 0, 4)), 'All 4 work steps are done.');
    assert.equal(progressSummary(steps(0, 0, 0, 1)), 'The work step is done.');
    assert.equal(progressSummary(steps(3, 0, 0, 0)), '0 of 3 work steps done');
    assert.equal(progressSummary(null), '');
  });
});

describe('client project status — arithmetic', () => {
  it('rounds the finished share', () => {
    assert.equal(percentDone(steps(2, 2, 1, 3)), 38);
    assert.equal(percentDone(steps(1, 0, 0, 1)), 50);
  });

  it('reads 100 only when everything is done and 0 only when nothing is', () => {
    assert.equal(percentDone(steps(0, 0, 0, 5)), 100);
    assert.equal(percentDone(steps(1, 0, 0, 399)), 99);
    assert.equal(percentDone(steps(399, 0, 0, 1)), 1);
    assert.equal(percentDone(steps(4, 0, 0, 0)), 0);
  });

  it('is 0 without numbers or without work', () => {
    assert.equal(percentDone(null), 0);
    assert.equal(percentDone(steps(0, 0, 0, 0)), 0);
  });
});

describe('client project status — project choice', () => {
  const list = [project('p1', 'Brand film'), project('p2', 'Autumn campaign')];

  it('shows every project when none is chosen and one when one is', () => {
    assert.deepEqual(forProject(list, '').map((p) => p.id), ['p1', 'p2']);
    assert.deepEqual(forProject(list, 'p2').map((p) => p.id), ['p2']);
    assert.deepEqual(forProject(list, 'unknown'), []);
  });

  it('offers projects with deliveries and projects with a status, each once, by name', () => {
    assert.deepEqual(projectChoices([['p1', 'Brand film'], ['p3', 'Website']], list), [['p2', 'Autumn campaign'], ['p1', 'Brand film'], ['p3', 'Website']]);
    assert.deepEqual(projectChoices([], []), []);
  });
});

describe('client project status — panel and page', () => {
  it('draws a labelled progress bar with a value and the four numbers', () => {
    assert.match(component, /role="progressbar"/);
    assert.match(component, /aria-valuemin=\{0\}/);
    assert.match(component, /aria-valuemax=\{100\}/);
    assert.match(component, /aria-valuenow=\{percent\}/);
    assert.match(component, /aria-label=\{`\$\{project\.name\}: \$\{summary\}`\}/);
    assert.match(component, /STAGES\.map/);
    assert.match(component, /Project status/);
  });

  it('offers nothing to open and names no working term', () => {
    assert.doesNotMatch(component, /<Link|href=|onClick|<button|<a /);
    for (const source of [component, lib]) {
      const shown = source.replace(/\/\*\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      assert.doesNotMatch(shown, /task|assignee|internal|blocked/i);
    }
    // ARCHIVED is the project's own state (shown as "Completed"); the panel itself never names it.
    assert.doesNotMatch(component, /archived/i);
  });

  it('shows nothing when the client has no shared project', () => {
    assert.match(component, /if \(projects\.length === 0\) return null;/);
  });

  it('My Work loads the status beside the deliveries and survives its failure', () => {
    assert.match(page, /apiFetch<Delivery\[\]>\('\/client\/deliveries'\)/);
    assert.match(page, /apiFetch<ProjectProgress\[\]>\('\/client\/progress'\)/);
    assert.match(page, /\.catch\(\(\) => setProgressFailed\(true\)\)/);
    assert.match(page, /<ClientProjectProgress projects=\{forProject\(progress, project\)\} \/>/);
    assert.match(page, /projectChoices\(\[\.\.\.map\.entries\(\)\], progress\)/);
    assert.match(page, /The project status could not be loaded\. Your deliveries are shown below\./);
  });

  it('the dashboard summary still shows no counters of working items', () => {
    assert.doesNotMatch(read('src/components/dashboard/client-dashboard-summary.tsx'), /tasks|client-progress|ClientProjectProgress/);
  });
});
