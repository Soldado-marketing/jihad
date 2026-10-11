/**
 * Audit UI (MAOS-T132): owner-only page over GET /audit-events.
 * Run: node --test test/audit-ui.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (p) => readFileSync(join(webRoot, p), 'utf8');

describe('audit ui', () => {
  it('is in the navigation for OWNER only', () => {
    const nav = read('src/navigation/navigation.ts');
    const entry = nav.slice(nav.indexOf("id: 'audit'"), nav.indexOf("id: 'audit'") + 220);
    assert.match(entry, /allowedRoles: \['OWNER'\]/);
  });

  it('reads the audit log with a cursor and never shows payloads', () => {
    const page = read('app/(workspace)/audit/page.tsx');
    assert.match(page, /`\/audit-events/);
    assert.match(page, /qs\.set\('before', before\)/);
    assert.doesNotMatch(page, /redactedPayload|sessionId/);
    assert.match(page, /<ErrorState/);
  });
});
