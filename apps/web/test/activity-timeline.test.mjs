/**
 * Activity timeline component (MAOS-T66).
 * Run: node --test test/activity-timeline.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { activityLabel, relativeTime } from '../src/lib/activity.ts';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (p) => readFileSync(join(webRoot, p), 'utf8');

describe('activity wording', () => {
  it('uses hand-written text for known actions and readable text otherwise', () => {
    assert.equal(activityLabel('invoice.sent'), 'Invoice sent');
    assert.equal(activityLabel('file.version.download'), 'File downloaded');
    assert.equal(activityLabel('task.status_changed'), 'Task status changed');
    assert.equal(activityLabel(''), 'Activity');
  });

  it('describes time relative to now, then as a date', () => {
    const now = new Date('2026-10-11T12:00:00Z');
    assert.equal(relativeTime('2026-10-11T11:59:30Z', now), 'just now');
    assert.equal(relativeTime('2026-10-11T11:45:00Z', now), '15 min ago');
    assert.equal(relativeTime('2026-10-11T09:00:00Z', now), '3 h ago');
    assert.equal(relativeTime('2026-10-09T12:00:00Z', now), '2 d ago');
    assert.equal(relativeTime('2026-09-01T12:00:00Z', now), '2026-09-01');
    assert.equal(relativeTime('not a date', now), '');
  });
});

describe('component', () => {
  it('reads the activity API and stays silent when access is refused', () => {
    const src = read('src/components/ui/activity-timeline.tsx');
    assert.match(src, /apiFetch<\{ items: ActivityEvent\[\] \}>\(`\/activity\/\$\{resourceType\}\/\$\{resourceId\}`\)/);
    assert.match(src, /if \(hidden\) return null;/);
    assert.doesNotMatch(src, /redactedPayload|payload/);
  });

  it('is shown on the invoice detail page', () => {
    assert.match(read('app/(workspace)/finance/invoices/[id]/page.tsx'), /<ActivityTimeline resourceType="invoice" resourceId=\{id\} \/>/);
  });
});
