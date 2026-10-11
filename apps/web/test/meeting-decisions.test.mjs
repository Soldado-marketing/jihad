/**
 * Meeting notes → decisions → tasks (MAOS-T109).
 * Run: node --test test/meeting-decisions.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { isDecision, taskFromDecision } from '../src/lib/meeting-decisions.ts';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (p) => readFileSync(join(webRoot, p), 'utf8');

describe('decision → task', () => {
  it('uses the decision as the title and points back to the meeting', () => {
    const t = taskFromDecision(' Kickoff ', 'Ship the landing page\n by Friday ');
    assert.equal(t.title, 'Ship the landing page by Friday');
    assert.match(t.description, /^Decision from the meeting "Kickoff":/);
  });

  it('stays within the task API limits (title 180, description 2000)', () => {
    const t = taskFromDecision('M', 'x'.repeat(5000));
    assert.equal(t.title.length, 180);
    assert.ok(t.title.endsWith('…'));
    assert.ok(t.description.length <= 2000);
  });

  it('recognises decision notes by thread', () => {
    assert.equal(isDecision({ threadKey: 'decision' }), true);
    assert.equal(isDecision({ threadKey: null }), false);
  });

  it('the meetings page opens the panel that records decisions and creates tasks', () => {
    assert.match(read('app/(workspace)/crm/meetings/page.tsx'), /<MeetingPanel meeting=\{open\}/);
    const panel = read('src/components/crm/meeting-panel.tsx');
    assert.match(panel, /resourceType: 'meeting', resourceId: meeting!\.id, threadKey: DECISION_THREAD/);
    assert.match(panel, /apiFetch<\{ id: string \}>\('\/tasks'/);
    assert.match(panel, /method: 'PATCH', body: JSON\.stringify\(\{ notes \}\)/);
  });
});
