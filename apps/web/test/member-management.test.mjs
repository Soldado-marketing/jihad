/**
 * Member management in the web app (owner decision 2026-11-01): Company access
 * offers Edit role and Remove from company, Invitations offers Revoke, and each
 * asks for confirmation first. The API enforces who may do it; this keeps the
 * UI honest.
 * Run: node --test test/member-management.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

describe('company access member actions', () => {
  const page = read('app/(workspace)/dashboard/admin/company-access/page.tsx');

  it('changes roles and removes members through the owner-only endpoints', () => {
    assert.match(page, /`\/admin\/users\/\$\{encodeURIComponent\(member\.userId\)\}\/role`/);
    assert.match(page, /`\/auth\/company-members\/\$\{encodeURIComponent\(member\.userId\)\}\/remove`/);
  });

  it('asks before either change and never offers them for Owners or removed members', () => {
    assert.match(page, /<ConfirmDialog title="Change role"/);
    assert.match(page, /<ConfirmDialog title="Remove from company"/);
    assert.match(page, /member\.role === 'OWNER' \|\| member\.status === 'REMOVED' \? <span/);
  });

  it('a client needs a customer before the role can change', () => {
    assert.match(page, /newRole === 'CLIENT' && !customerId/);
    assert.match(page, /\{ role: newRole, customerId \}/);
  });
});

describe('invitations', () => {
  it('asks before revoking an invitation', () => {
    const page = read('app/(workspace)/dashboard/admin/invites/page.tsx');
    assert.match(page, /onClick=\{\(\) => setRevokeTarget\(inv\)\}/);
    assert.match(page, /<ConfirmDialog title="Revoke invitation"/);
  });
});

describe('confirm dialog', () => {
  it('is a labelled modal that focuses Cancel and closes on Escape', () => {
    const dialog = read('src/components/ui/confirm-dialog.tsx');
    assert.match(dialog, /role="dialog" aria-modal="true" aria-labelledby=\{titleId\}/);
    assert.match(dialog, /cancelRef\.current\?\.focus\(\)/);
    assert.match(dialog, /e\.key === 'Escape'/);
  });
});
