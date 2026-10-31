/**
 * Owner Control Center (web): OWNER-only entry, data only from the server
 * endpoint, records opened through the existing company switch, and the
 * approval queue opening a linked request.
 * Run: node --test test/control-center.test.mjs
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
const page = read('app/(workspace)/control-center/page.tsx');
const switching = read('src/lib/company-switch.ts');
const approvals = read('app/(workspace)/approvals/page.tsx');
const has = (role) => filterNavigationItems(role, workspaceNavigation).some((i) => i.id === 'control-center');

describe('who sees the Control Center', () => {
  it('is in the navigation for OWNER only', () => {
    assert.equal(has('OWNER'), true);
    for (const role of ['MANAGER', 'EMPLOYEE', 'CONTRACTOR', 'CLIENT']) assert.equal(has(role), false, role);
    assert.match(read('src/components/shell/sidebar.tsx'), /ids: \['dashboard', 'control-center',/);
  });

  it('shows a denied state to other roles and does not call the API for them', () => {
    assert.match(page, /if \(u\?\.role === 'OWNER'\) void load\(\);/);
    assert.match(page, /<DeniedState title="All my companies"/);
  });
});

describe('data and actions', () => {
  it('reads only the server overview, never a company id from the browser', () => {
    assert.deepEqual([...page.matchAll(/apiFetch<[^>]+>\('([^']+)'/g)].map((m) => m[1]), ['/dashboards/control-center']);
    assert.doesNotMatch(page, /tenantId=|\/tenants\//);
  });

  it('opens records through openInCompany with the live session company', () => {
    assert.match(page, /openInCompany\(item\.tenantId, getStoredTenant\(\)\?\.id \?\? data\.currentTenantId, item\.href/);
    assert.match(switching, /'\/auth\/companies\/switch'/);
    assert.match(switching, /window\.location\.assign\(role === 'CLIENT' \? '\/client' : href\)/, 'full reload after a switch');
  });

  it('ignores a response that finished after a company switch or a newer request', () => {
    assert.match(page, /if \(id !== request\.current \|\| getStoredTenant\(\)\?\.id !== tenantAtStart\) return;/);
  });

  it('never adds amounts across currencies', () => {
    assert.match(page, /formatCents\(m\.openCents, m\.currency\)/);
    assert.doesNotMatch(page, /reduce\([^)]*openCents/);
  });

  it('keeps the company switcher on the same switch helper', () => {
    assert.match(read('src/components/shell/company-switcher.tsx'), /await switchCompanySession\(targetId\)/);
  });
});

describe('approval queue deep link', () => {
  it('opens the decision only for a waiting request of this company', () => {
    assert.match(approvals, /new URLSearchParams\(window\.location\.search\)\.get\('open'\)/);
    assert.match(approvals, /if \(match && splitQueue\(\[match\]\)\.waiting\.length\) \{/);
  });
});
