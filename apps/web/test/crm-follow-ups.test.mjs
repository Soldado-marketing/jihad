/**
 * Follow-ups page uses the backend's FollowUpStatus values (MAOS-F3).
 * Run: node --test test/crm-follow-ups.test.mjs
 *
 * The page sent `status: 'DONE'` and only offered "complete" for `PENDING`;
 * neither value exists (OPEN | COMPLETED | OVERDUE), so completing a
 * follow-up failed with a server error and the button never appeared.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const page = readFileSync(join(webRoot, 'app/(workspace)/crm/follow-ups/page.tsx'), 'utf8');

describe('follow-ups page statuses', () => {
  it('completes a follow-up with COMPLETED', () => {
    assert.match(page, /JSON\.stringify\(\{ status: 'COMPLETED' \}\)/);
  });

  it('uses only OPEN, COMPLETED and OVERDUE', () => {
    assert.doesNotMatch(page, /'PENDING'|'DONE'|PENDING:|DONE:/);
    for (const status of ['OPEN', 'COMPLETED', 'OVERDUE']) assert.match(page, new RegExp(`${status}:`));
  });
});
