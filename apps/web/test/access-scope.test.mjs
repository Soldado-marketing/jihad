/**
 * The UI offers no visibility choice the backend does not enforce (MAOS-T36).
 * Run: node --test test/access-scope.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { clientScopeKeyPayload, effectiveAccessLabel } from '../src/security/access-scope.ts';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (p) => readFileSync(join(webRoot, p), 'utf8');
const approvals = read('app/(workspace)/dashboard/admin/users/requests/page.tsx');
const settings = read('app/(workspace)/settings/page.tsx');

describe('effective access', () => {
  it('describes a client as limited to its own client', () => {
    assert.match(effectiveAccessLabel('CLIENT'), /own client only/i);
  });

  it('describes owner, manager and employee as workspace-wide, limited by role', () => {
    for (const role of ['OWNER', 'MANAGER', 'EMPLOYEE', undefined]) {
      assert.match(effectiveAccessLabel(role), /whole workspace/i);
    }
  });

  it('describes a contractor as limited to assigned work (MAOS-T35)', () => {
    assert.match(effectiveAccessLabel('CONTRACTOR'), /assigned/i);
    assert.doesNotMatch(effectiveAccessLabel('CONTRACTOR'), /whole workspace/i);
  });

  it('offers no unenforced visibility scope when approving a user', () => {
    for (const value of ['ASSIGNED_ITEMS_ONLY', 'WORKSPACE_LEVEL', 'PROJECT_LEVEL', 'Assigned items only']) {
      assert.ok(!approvals.includes(value), `approval page still offers ${value}`);
    }
    assert.doesNotMatch(approvals, /visibilityScope:/, 'approval request must not send a chosen scope');
    assert.match(approvals, /effectiveAccessLabel\(approveRole\)/);
  });

  it('shows the effective access on the settings page, not the raw stored scope', () => {
    assert.doesNotMatch(settings, /value=\{me\.visibilityScope/);
    assert.match(settings, /effectiveAccessLabel\(me\.role\)/);
  });
});

describe('client key on approval and role change (F-1)', () => {
  it('requires a valid key for a CLIENT and sends none for other roles', () => {
    assert.deepEqual(clientScopeKeyPayload('CLIENT', ' acme-gmbh '), { clientScopeKey: 'acme-gmbh' });
    for (const bad of ['', '   ', 'acme gmbh', 'a/b', '-acme', 'x'.repeat(121)]) {
      assert.equal(clientScopeKeyPayload('CLIENT', bad), null, `accepted ${JSON.stringify(bad)}`);
    }
    for (const role of ['MANAGER', 'EMPLOYEE', 'CONTRACTOR']) {
      assert.deepEqual(clientScopeKeyPayload(role, 'acme'), {});
    }
  });

  it('sends the client key from both the approve and the change-role form', () => {
    assert.match(approvals, /clientScopeKeyPayload\(approveRole, approveClientKey\)/);
    assert.match(approvals, /clientScopeKeyPayload\(changeRoleValue, changeRoleClientKey\)/);
  });
});
