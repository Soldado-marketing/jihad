/**
 * Explicit per-company grants in the web app (owner decision 2026-10-31):
 * the owner switches them on Company access; the approval queue offers
 * decisions only to approvers. The API enforces both; this keeps the UI honest.
 * Run: node --test test/explicit-grants.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

describe('company access grants', () => {
  const page = read('app/(workspace)/dashboard/admin/company-access/page.tsx');
  it('offers the three grants through the owner-only endpoint', () => {
    for (const key of ['decide-approvals', 'invoices', 'all-tasks']) assert.match(page, new RegExp(`key: '${key}'`));
    assert.match(page, /\/auth\/company-members\/\$\{encodeURIComponent\(member\.userId\)\}\/grants\/\$\{grant\}/);
    assert.match(page, /aria-pressed=\{!!member\.grants\[g\.key\]\}/);
  });
  it('shows only grants that apply to the member role', () => {
    assert.match(page, /GRANTS\.filter\(\(g\) => g\.key in \(member\.grants \?\? \{\}\)\)/);
  });
});

describe('approval queue', () => {
  const page = read('app/(workspace)/approvals/page.tsx');
  it('asks the API whether the user is an approver and hides decisions otherwise', () => {
    assert.match(page, /apiFetch<\{ canDecide: boolean \}>\('\/approvals\/me'\)/);
    assert.match(page, /\{tab === 'waiting' && canDecide && \(/);
    assert.match(page, /open=\{selected !== null && canDecide\}/);
  });
});
