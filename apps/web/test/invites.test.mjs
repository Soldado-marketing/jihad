/**
 * Invite flow UI contract (MAOS F-2).
 * Run: node --test test/invites.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { acceptFormError, canRevoke, INVITE_ROLES, isInviteToken } from '../src/lib/invites.ts';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (p) => readFileSync(join(webRoot, p), 'utf8');

describe('invite flow UI', () => {
  it('offers only the roles the API accepts', () => {
    assert.deepEqual(INVITE_ROLES.map((r) => r.value).sort(), ['CONTRACTOR', 'EMPLOYEE', 'MANAGER']);
  });

  it('sends only well-formed tokens to the API', () => {
    assert.equal(isInviteToken('a'.repeat(43)), true);
    assert.equal(isInviteToken('A-_9'.repeat(10) + 'abc'), true);
    for (const bad of [undefined, null, '', 'a'.repeat(42), 'a'.repeat(44), `${'a'.repeat(42)}=`, `${'a'.repeat(42)}/`]) {
      assert.equal(isInviteToken(bad), false, String(bad));
    }
  });

  it('checks name, password length and confirmation before submitting', () => {
    const ok = { fullName: 'Jane Doe', password: 'longenough', confirm: 'longenough' };
    assert.equal(acceptFormError(ok), null);
    assert.match(acceptFormError({ ...ok, fullName: ' J ' }), /full name/);
    assert.match(acceptFormError({ ...ok, password: 'short', confirm: 'short' }), /8 to 128/);
    assert.match(acceptFormError({ ...ok, password: 'x'.repeat(129), confirm: 'x'.repeat(129) }), /8 to 128/);
    assert.match(acceptFormError({ ...ok, confirm: 'different!' }), /do not match/);
  });

  it('allows revoking only open invites', () => {
    assert.deepEqual(['SENT', 'ACCEPTED', 'EXPIRED', 'REVOKED', 'DRAFT'].map(canRevoke), [true, false, false, false, false]);
  });

  it('the acceptance page calls the real endpoints and never claims success on its own', () => {
    const page = read('app/(auth)/auth/invite/page.tsx');
    assert.match(page, /\/auth\/invites\/preview/);
    assert.match(page, /\/auth\/invites\/accept/);
    assert.match(page, /if \(!res\.ok\)/);
  });

  it('the admin page is OWNER-only in navigation and uses the admin endpoints', () => {
    const nav = read('src/navigation/navigation.ts');
    assert.match(nav, /href: '\/dashboard\/admin\/invites',\s*allowedRoles: \['OWNER'\]/);
    const admin = read('app/(workspace)/dashboard/admin/invites/page.tsx');
    assert.match(admin, /apiFetch<CreateResult>\('\/admin\/invites'/);
    assert.match(admin, /\/admin\/invites\/\$\{[^}]+\}\/revoke/);
  });
});
