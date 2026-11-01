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
import { filterNavigationItems } from '../src/security/ui-permissions.ts';
import { workspaceNavigation } from '../src/navigation/navigation.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

describe('company access grants', () => {
  const page = read('app/(workspace)/dashboard/admin/company-access/page.tsx');
  it('offers the three grants through the owner-only endpoint', () => {
    for (const key of ['decide-approvals', 'invoices-read', 'invoices-edit', 'payments-record', 'all-tasks']) {
      assert.match(page, new RegExp(`key: '${key}'`));
    }
    assert.match(page, /\/auth\/company-members\/\$\{encodeURIComponent\(member\.userId\)\}\/grants\/\$\{grant\}/);
    assert.match(page, /on=\{!!member\.grants\[g\.key\]\}/);
  });
  it('states each permission and switching as an on/off switch, not only by colour', () => {
    assert.match(page, /role="switch" aria-checked=\{on\}/);
    assert.match(page, /\{on \? 'On' : 'Off'\}/);
    assert.match(page, /<Toggle label="Can switch to their other companies" on=\{member\.canSwitch\}/);
    assert.doesNotMatch(page, /Revoke access/);
  });
  it('lays members out as cards, without a horizontally scrolling table', () => {
    assert.doesNotMatch(page, /<table/);
    assert.match(page, /<ul className="space-y-3">/);
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

describe('finance navigation follows the grants', () => {
  const ids = (role, grants) => filterNavigationItems(role, workspaceNavigation, grants).map((i) => i.id);
  it('shows Invoices to a manager with any invoice grant, never Finance totals', () => {
    assert.ok(!ids('MANAGER', {}).includes('invoices'));
    for (const g of ['invoices-read', 'invoices-edit', 'payments-record']) {
      assert.ok(ids('MANAGER', { [g]: true }).includes('invoices'), g);
      assert.ok(!ids('MANAGER', { [g]: true }).includes('finance'), g);
    }
  });
  it('never shows it to a client, and the owner keeps Finance', () => {
    assert.ok(!ids('CLIENT', { 'invoices-read': true }).includes('invoices'));
    assert.ok(ids('OWNER', {}).includes('finance'));
  });
  it('loads the grants for the navigation and gates invoice actions', () => {
    assert.match(read('src/components/shell/sidebar.tsx'), /visibleNavGroups\(role, useMyGrants\(role !== 'OWNER' && role !== 'CLIENT'\)\)/);
    const detail = read('app/(workspace)/finance/invoices/[id]/page.tsx');
    assert.match(detail, /const canEdit = role === 'OWNER' \|\| grants\['invoices-edit'\] === true;/);
    assert.match(detail, /const canRecord = role === 'OWNER' \|\| grants\['payments-record'\] === true;/);
    assert.match(detail, /\{canRecord && \(\s*<form onSubmit=\{recordPayment\}/);
  });
});

describe('chat channel members', () => {
  it('only owners and managers get the members panel', () => {
    const chat = read('app/(workspace)/chat/page.tsx');
    assert.match(chat, /setCanManage\(r === 'OWNER' \|\| r === 'MANAGER'\)/);
    assert.match(chat, /\{canManage && <ChannelMembers key=\{activeChannel\.id\} channelId=\{activeChannel\.id\} \/>\}/);
    assert.match(read('src/components/chat/channel-members.tsx'), /rows\.filter\(\(p\) => p\.role !== 'CLIENT'\)/);
  });
});

