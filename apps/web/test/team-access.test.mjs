/**
 * Team & Access (MAOS E01): Members & access, Invitations and User requests
 * live under one route with tabs. The former pages render unchanged, the old
 * routes redirect, no API or permission changed and a CLIENT never sees it.
 * Run: node --test test/team-access.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { filterNavigationItems } from '../src/security/ui-permissions.ts';
import { workspaceNavigation } from '../src/navigation/navigation.ts';
import { isTeamTabActive, TEAM_TABS } from '../src/navigation/team-tabs.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const route = (p) => read(`app/(workspace)/${p}/page.tsx`);

describe('one Team & Access entry in the navigation', () => {
  const team = workspaceNavigation.find((i) => i.id === 'team');

  it('is OWNER-only and replaces the three separate admin entries', () => {
    assert.deepEqual(team && { href: team.href, roles: team.allowedRoles }, { href: '/team', roles: ['OWNER'] });
    assert.deepEqual(workspaceNavigation.filter((i) => ['admin-users', 'admin-invites', 'company-access'].includes(i.id)), []);
    assert.equal(workspaceNavigation.filter((i) => i.href.startsWith('/team')).length, 1);
  });

  it('shows up for the OWNER only, never for a CLIENT or a granted manager', () => {
    const sees = (role, grants) => filterNavigationItems(role, workspaceNavigation, grants).some((i) => i.id === 'team');
    assert.equal(sees('OWNER'), true);
    for (const role of ['MANAGER', 'EMPLOYEE', 'CONTRACTOR', 'CLIENT']) {
      assert.equal(sees(role, { 'decide-approvals': true, 'all-tasks': true }), false, role);
    }
  });

  it('has a sidebar slot in the Company & Team group and a glyph', () => {
    const sidebar = read('src/components/shell/sidebar.tsx');
    assert.match(sidebar, /ids: \['team', 'audit'\]/);
    assert.match(sidebar, /team: 'TM'/);
    assert.doesNotMatch(sidebar, /admin-users|admin-invites|company-access/, 'no stale ids or special cases');
  });
});

describe('the tabs', () => {
  it('are the three sections, in order, as links the user can bookmark', () => {
    assert.deepEqual(TEAM_TABS.map((t) => t.href), ['/team/members', '/team/invitations', '/team/requests']);
    assert.deepEqual(TEAM_TABS.map((t) => t.label), ['Members & access', 'Invitations', 'User requests']);
    const tabs = read('src/components/team/team-tabs.tsx');
    assert.match(tabs, /<nav aria-label="Team & Access sections"/);
    assert.match(tabs, /aria-current=\{active \? 'page' : undefined\}/);
    assert.match(read('app/(workspace)/team/layout.tsx'), /<TeamTabs \/>\s*\{children\}/);
  });

  it('mark the current section, including its sub-pages', () => {
    assert.equal(isTeamTabActive('/team/members', '/team/members'), true);
    assert.equal(isTeamTabActive('/team/members', '/team/members/x'), true);
    assert.equal(isTeamTabActive('/team/members', '/team/invitations'), false);
    assert.equal(isTeamTabActive('/team/members', null), false);
  });

  it('render the former pages unchanged and open on members', () => {
    assert.match(route('team/members'), /export \{ default \} from '@\/components\/team\/company-access-panel';/);
    assert.match(route('team/invitations'), /export \{ default \} from '@\/components\/team\/invitations-panel';/);
    assert.match(route('team/requests'), /export \{ default \} from '@\/components\/team\/registration-requests-panel';/);
    assert.match(route('team'), /redirect\('\/team\/members'\)/);
  });
});

describe('the former pages', () => {
  it('still use the same owner-only endpoints and protections', () => {
    const members = read('src/components/team/company-access-panel.tsx');
    assert.match(members, /apiFetch<Member\[\]>\('\/auth\/company-members'\)/);
    assert.match(members, /member\.role === 'OWNER' \|\| member\.status === 'REMOVED' \? <span/, 'owners cannot be edited or removed here');
    assert.match(members, /setOwner\(getStoredUser\(\)\?\.role === 'OWNER'\)/);
    assert.match(read('src/components/team/invitations-panel.tsx'), /apiFetch<Invite\[\]>\('\/admin\/invites'\)/);
    assert.match(read('src/components/team/registration-requests-panel.tsx'), /\/admin\/users\/requests/);
  });

  it('keep their old routes as redirects, including the e-mail review link', () => {
    assert.match(route('dashboard/admin/company-access'), /redirect\('\/team\/members'\)/);
    assert.match(route('dashboard/admin/invites'), /redirect\('\/team\/invitations'\)/);
    assert.match(route('dashboard/admin/users/requests'), /redirect\('\/team\/requests'\)/);
    // The registration e-mail (API mail.service) sends the OWNER to the old URL.
    assert.match(read('../api/src/modules/mail/mail.service.ts'), /\/dashboard\/admin\/users\/requests/);
  });

  it('are linked from the dashboard by their new addresses', () => {
    const dashboard = read('app/(workspace)/dashboard/page.tsx');
    assert.match(dashboard, /<Link href="\/team\/requests"/);
    assert.match(dashboard, /<Link href="\/team\/invitations"/);
    assert.doesNotMatch(dashboard, /dashboard\/admin\//);
  });

  it('are not part of the client portal', () => {
    const client = read('src/components/client-portal/client-sidebar.tsx') + read('src/components/client-portal/client-shell.tsx');
    assert.doesNotMatch(client, /\/team/);
  });
});
