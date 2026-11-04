/**
 * Sidebar groups (MAOS M02): Workspace · Company & Team · Projects & Delivery ·
 * Customers & CRM · Finance & Banking · AI Assistant · Reports · Settings.
 * A group is a heading only; who sees what still comes from navigation.ts.
 * Run: node --test test/sidebar-groups.test.mjs
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
const sidebar = read('src/components/shell/sidebar.tsx');

// The groups as written, without importing a client component into node.
const groups = [...sidebar.slice(sidebar.indexOf('export const navGroups')).matchAll(/ids: \[([^\]]*)\],\s*label: '([^']+)'/g)]
  .map((m) => ({ ids: [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]), label: m[2] }));
const TARGET = ['Workspace', 'Company & Team', 'Projects & Delivery', 'Customers & CRM', 'Finance & Banking', 'AI Assistant', 'Reports', 'Settings'];
const navIds = workspaceNavigation.filter((i) => i.sprint2Status !== 'deferred').map((i) => i.id);
const view = (role, grants = {}) =>
  groups
    .map((g) => ({ label: g.label, items: filterNavigationItems(role, workspaceNavigation, grants).filter((i) => g.ids.includes(i.id)).map((i) => i.label) }))
    .filter((g) => g.items.length > 0);

describe('the eight target groups', () => {
  it('appear in the plan order, with AI Assistant empty until phase L ships', () => {
    assert.deepEqual(groups.map((g) => g.label), TARGET);
    assert.deepEqual(groups.find((g) => g.label === 'AI Assistant').ids, []);
  });

  it('give every navigation id exactly one slot, including the ids pending in other PRs', () => {
    const all = groups.flatMap((g) => g.ids);
    assert.deepEqual(all.filter((id, i) => all.indexOf(id) !== i), [], 'no id in two groups');
    assert.deepEqual(navIds.filter((id) => !all.includes(id)), [], 'every navigation id has a slot');
    for (const pending of ['team', 'requests']) assert.ok(all.includes(pending), `${pending} has a slot before its PR merges`);
    assert.match(sidebar, /team: 'TM'/);
    assert.match(sidebar, /requests: 'WR'/);
  });

  it('put company administration, delivery work, customers, money, reports and settings apart', () => {
    const by = Object.fromEntries(groups.map((g) => [g.label, g.ids]));
    assert.deepEqual(by['Company & Team'], ['team', 'audit']);
    assert.deepEqual(by['Projects & Delivery'], ['projects', 'tasks', 'time', 'files', 'approvals', 'voice', 'complaints', 'requests']);
    assert.deepEqual(by['Customers & CRM'], ['customers', 'crm']);
    assert.deepEqual(by['Finance & Banking'], ['finance', 'invoices']);
    assert.deepEqual(by.Settings, ['data', 'settings']);
    assert.deepEqual(by.Workspace, ['dashboard', 'control-center', 'my-work', 'calendar', 'notifications', 'chat', 'collaboration']);
  });
});

describe('who sees what is unchanged', () => {
  it('routes, roles and grants in navigation.ts are what they were', () => {
    // M02 is a heading-only change: the sidebar file is the only one touched.
    const nav = read('src/navigation/navigation.ts');
    assert.match(nav, /id: 'finance',\s*label: 'Finance',\s*href: '\/finance',\s*allowedRoles: \['OWNER'\]/);
    assert.match(nav, /id: 'invoices',[\s\S]*?allowedRoles: \[\],\s*grants: \['invoices-read', 'invoices-edit', 'payments-record'\]/);
    assert.match(sidebar, /return navGroups\s*\.map\(\(group\) => \(\{[\s\S]*items: items\.filter\(\(item\) => group\.ids\.includes\(item\.id\)\)/, 'permission filter first, grouping after');
    assert.match(sidebar, /\.filter\(\(group\) => group\.items\.length > 0\)/, 'empty groups are not rendered');
  });

  it('a CLIENT sees no group at all', () => {
    assert.deepEqual(view('CLIENT'), []);
    assert.deepEqual(view('CLIENT', { 'invoices-read': true, 'all-tasks': true }), []);
  });

  it('a CONTRACTOR sees Workspace, Projects & Delivery and Settings only', () => {
    assert.deepEqual(view('CONTRACTOR'), [
      { label: 'Workspace', items: ['Dashboard', 'My Work', 'Calendar'] },
      { label: 'Projects & Delivery', items: ['Projects', 'Tasks', 'Time & Costs'] },
      { label: 'Settings', items: ['Import & export', 'Settings'] },
    ]);
  });

  it('a MANAGER gets Finance & Banking only through an invoice grant, never Company & Team', () => {
    const labels = (grants) => view('MANAGER', grants).map((g) => g.label);
    assert.ok(!labels().includes('Finance & Banking'));
    assert.ok(!labels().includes('Company & Team'));
    assert.ok(labels({ 'invoices-read': true }).includes('Finance & Banking'));
    assert.deepEqual(view('MANAGER', { 'invoices-read': true }).find((g) => g.label === 'Finance & Banking').items, ['Invoices']);
  });

  it('the OWNER sees every group that has an item today', () => {
    assert.deepEqual(view('OWNER').map((g) => g.label), ['Workspace', 'Company & Team', 'Projects & Delivery', 'Customers & CRM', 'Finance & Banking', 'Reports', 'Settings']);
    assert.deepEqual(view('OWNER').find((g) => g.label === 'Company & Team').items, ['Team & Access', 'Audit Log']);
  });
});
