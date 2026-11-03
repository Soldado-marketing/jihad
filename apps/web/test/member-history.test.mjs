/**
 * Member access history (plan row E02): under each member on the team page
 * the OWNER opens the role and permission changes with who did it and when.
 * Loaded only when opened, from the OWNER-only audit route; never on a client
 * page. Run: node --test test/member-history.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { activityLabel } from '../src/lib/activity.ts';
import { historyActor, historyDetail } from '../src/lib/member-history.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

describe('member history wording', () => {
  it('names every access action in plain words', () => {
    assert.equal(activityLabel('role.changed'), 'Role changed');
    assert.equal(activityLabel('membership.grant_updated'), 'Permission changed');
    assert.equal(activityLabel('membership.removed'), 'Removed from company');
    assert.equal(activityLabel('user.suspended'), 'Suspended');
    assert.equal(activityLabel('user.reactivated'), 'Reactivated');
    assert.equal(activityLabel('role.assigned'), 'Role assigned');
  });

  it('explains the change from the audit details', () => {
    assert.equal(historyDetail('role.changed', { previousRole: 'EMPLOYEE', newRole: 'MANAGER' }), 'Employee → Manager');
    assert.equal(historyDetail('role.changed', { newRole: 'CLIENT' }), 'Now Client');
    assert.equal(historyDetail('membership.grant_updated', { grant: 'all-tasks', enabled: true }), 'Sees all tasks: on');
    assert.equal(historyDetail('membership.grant_updated', { grant: 'invoices-read', enabled: false }), 'Views invoices: off');
    assert.equal(historyDetail('membership.removed', { role: 'CONTRACTOR', permissionsCleared: 2 }), 'Was Contractor');
    assert.equal(historyDetail('role.assigned', { role: 'EMPLOYEE' }), 'Joined as Employee');
    assert.equal(historyDetail('scope.assigned', { visibilityScope: 'TENANT_WIDE', clientScopeKey: null }), 'Scope tenant wide');
    assert.equal(historyDetail('scope.assigned', { clientScopeKey: 'k1' }), 'Client scope set');
    assert.equal(historyDetail('user.suspended', null), '');
  });

  it('names the actor, never an id', () => {
    assert.equal(historyActor({ id: 'u1', displayName: 'Dana Owner' }), 'Dana Owner');
    assert.equal(historyActor({ id: 'u1', displayName: '  ' }), 'System');
    assert.equal(historyActor(null), 'System');
  });
});

describe('member history on the team page', () => {
  const panel = read('src/components/team/member-history.tsx');
  const page = read('app/(workspace)/dashboard/admin/company-access/page.tsx');

  it('sits under every member card and loads only when opened', () => {
    assert.match(page, /import \{ MemberHistory \} from '@\/components\/team\/member-history'/);
    assert.match(page, /<MemberHistory userId=\{member\.userId\} \/>/);
    assert.match(panel, /<details[^>]*onToggle=/);
    assert.match(panel, /if \(items !== null\) return;/);
    assert.match(panel, /apiFetch<\{ items: MemberHistoryItem\[\] \}>\(`\/audit-events\/member\/\$\{encodeURIComponent\(userId\)\}`\)/);
  });

  it('shows what changed, who did it and when, and a quiet empty state', () => {
    assert.match(panel, /activityLabel\(item\.action\)/);
    assert.match(panel, /historyDetail\(item\.action, item\.details\)/);
    assert.match(panel, /by \{historyActor\(item\.actor\)\} · \{new Date\(item\.createdAt\)\.toLocaleString\(\)\}/);
    assert.match(panel, /No role or permission changes recorded yet\./);
    assert.match(panel, /aria-label="Access history"/);
    assert.match(panel, /min-h-11/);
    assert.doesNotMatch(panel, /item\.actor\?\.id|item\.id\}<|resourceId/);
  });

  it('never reaches a client page', () => {
    const clientDir = join(root, 'app/(client)');
    const files = [];
    const walk = (dir) => { for (const f of readdirSync(dir, { withFileTypes: true })) { const p = join(dir, f.name); if (f.isDirectory()) walk(p); else files.push(p); } };
    walk(clientDir);
    for (const f of files) assert.doesNotMatch(readFileSync(f, 'utf8'), /member-history|MemberHistory|audit-events/, f);
    for (const f of readdirSync(join(root, 'src/components/client-portal'))) {
      assert.doesNotMatch(read(`src/components/client-portal/${f}`), /member-history|MemberHistory|audit-events/, f);
    }
  });
});
