/**
 * Role-aware Dashboard: every card and link on /dashboard follows the same
 * navigation rules as the sidebar, finance stays OWNER-only, and a CLIENT is
 * sent to the client portal instead of the internal workspace.
 * Run: node --test test/dashboard-roles.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { filterNavigationItems } from '../src/security/ui-permissions.ts';
import { workspaceNavigation } from '../src/navigation/navigation.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const dashboard = read('app/(workspace)/dashboard/page.tsx');
const layout = read('app/(workspace)/layout.tsx');
const navIds = (role) => new Set(filterNavigationItems(role, workspaceNavigation).map((i) => i.id));

describe('dashboard links follow the navigation rules', () => {
  it('derives what a role may open from filterNavigationItems', () => {
    assert.match(dashboard, /filterNavigationItems\(user\.role as WorkspaceRole, workspaceNavigation\)/);
    assert.match(dashboard, /\.filter\(\(\[, , , nav\]\) => can\(nav\)\)/, 'summary chips are filtered by role');
  });

  it('shows approvals only to roles that can open /approvals', () => {
    assert.match(dashboard, /can\('approvals'\) && \(/);
    assert.equal(navIds('CONTRACTOR').has('approvals'), false);
    assert.equal(navIds('EMPLOYEE').has('approvals'), true);
  });

  it('shows both the company-wide pending approvals and the ones for you to decide', () => {
    assert.match(dashboard, /\['Pending approvals \(company\)', summary\.collaboration\.pendingApprovals, '\/approvals', 'approvals'\]/);
    assert.match(dashboard, /Pending in the company: /);
    assert.match(dashboard, /<ActionCard label="Approvals for you to decide" count=\{mine\.approvals\.toDecide\.length\}/);
  });

  it('keeps CRM chips away from employees and contractors', () => {
    for (const role of ['EMPLOYEE', 'CONTRACTOR']) assert.equal(navIds(role).has('crm'), false, role);
    for (const role of ['OWNER', 'MANAGER']) assert.equal(navIds(role).has('crm'), true, role);
  });

  it('keeps finance and access requests OWNER-only', () => {
    assert.match(dashboard, /if \(canSeeFinance\(u\?\.role\)\) \{/);
    assert.match(dashboard, /user\?\.role === 'OWNER' && \(\s*<>\s*<Link href="\/dashboard\/admin\/users\/requests"/);
    for (const role of ['MANAGER', 'EMPLOYEE', 'CONTRACTOR']) assert.equal(navIds(role).has('finance'), false, role);
  });

  it('loads the team-wide task list only for OWNER and MANAGER', () => {
    assert.match(dashboard, /if \(u\?\.role === 'OWNER' \|\| u\?\.role === 'MANAGER'\) \{/);
  });
});

describe('a CLIENT never lands in the internal workspace', () => {
  it('redirects to the client portal from the workspace layout', () => {
    assert.match(layout, /if \(user\?\.role === 'CLIENT'\) \{\s*router\.replace\('\/client'\);\s*return;/);
  });
});

describe('one page heading', () => {
  it('renders the company name in the switcher as text, not an h1', () => {
    const switcher = read('src/components/shell/company-switcher.tsx');
    assert.doesNotMatch(switcher, /<h1[\s>][^)]*className/);
  });
});
