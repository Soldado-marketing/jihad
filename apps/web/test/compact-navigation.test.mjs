/**
 * Compact mobile navigation (UX R9): below lg a bottom bar plus a Menu dialog
 * replace the sidebar strip; from lg up the sidebar is unchanged.
 * Run: node --test test/compact-navigation.test.mjs
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
const shell = (f) => read(`src/components/shell/${f}`);
const mobile = shell('compact-nav.tsx');
const sidebar = shell('sidebar.tsx');
const quickIds = [...mobile.match(/QUICK_NAV_IDS = \[([^\]]*)\]/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);

describe('the sidebar on desktop', () => {
  it('is hidden below lg and keeps its desktop layout from lg up', () => {
    assert.match(sidebar, /className="hidden [^"]*lg:sticky lg:top-0 lg:block lg:min-h-screen lg:w-72 [^"]*lg:border-e/);
    assert.doesNotMatch(sidebar, /overflow-x-auto/, 'no horizontal nav strip');
    assert.match(shell('app-shell.tsx'), /lg:flex/);
    assert.doesNotMatch(shell('app-shell.tsx'), /md:flex/);
  });

  it('shares its permission filter, groups and active state with the compact menu', () => {
    assert.match(sidebar, /export function visibleNavGroups\(role: WorkspaceRole\)[\s\S]*filterNavigationItems\(role, workspaceNavigation\)/);
    assert.match(sidebar, /const visibleGroups = visibleNavGroups\(role\);/);
    assert.match(sidebar, /const isActive = isNavItemActive\(item, pathname\);/);
    assert.match(mobile, /const groups = visibleNavGroups\(role\);/);
    assert.doesNotMatch(mobile, /workspaceNavigation|allowedRoles/, 'no second, unfiltered item list');
  });
});

describe('the mobile bottom bar', () => {
  it('is shown below lg only and rendered by the app shell', () => {
    assert.match(shell('app-shell.tsx'), /<CompactNav role=\{role\} \/>/);
    assert.match(mobile, /aria-label=\{labels\.bar\}\s+className="fixed inset-x-0 bottom-0 [^"]*lg:hidden"/);
    assert.match(mobile, /<div className="fixed inset-0 z-40 lg:hidden">/);
  });

  it('links Dashboard, Projects and Tasks (the Kanban board) directly', () => {
    assert.deepEqual(quickIds, ['dashboard', 'projects', 'tasks']);
    const hrefs = quickIds.map((id) => workspaceNavigation.find((i) => i.id === id)?.href);
    assert.deepEqual(hrefs, ['/dashboard', '/projects', '/tasks']);
    assert.match(read('src/components/tasks/task-filters.ts'), /const DEFAULT_VIEW: View = 'kanban';/);
  });

  it('shows a shortcut only when the role may open it', () => {
    const quickFor = (role) => filterNavigationItems(role, workspaceNavigation).filter((i) => quickIds.includes(i.id)).map((i) => i.id);
    for (const role of ['OWNER', 'MANAGER', 'EMPLOYEE', 'CONTRACTOR']) {
      assert.deepEqual(quickFor(role), ['dashboard', 'projects', 'tasks'], role);
    }
    assert.deepEqual(quickFor('CLIENT'), [], 'clients never get workspace shortcuts');
    assert.match(mobile, /QUICK_NAV_IDS\.flatMap\(\(id\) => items\.filter/);
  });

  it('keeps the content clear of the bar on small screens and unchanged on desktop', () => {
    assert.match(shell('workspace-content.tsx'), /pb-24 pt-5 [^"]*lg:py-8/);
  });
});

describe('the Menu dialog is accessible', () => {
  it('announces itself from the Menu button', () => {
    assert.match(mobile, /aria-haspopup="dialog"\s+aria-expanded=\{open\}\s+aria-controls=\{panelId\}/);
    assert.match(mobile, /role="dialog"\s+aria-modal="true"\s+aria-labelledby=\{titleId\}/);
    assert.match(mobile, /aria-label=\{labels\.close\}/);
    assert.match(mobile, /aria-current=\{active \? 'page' : undefined\}/);
  });

  it('moves focus in, traps Tab, closes on Escape and returns focus', () => {
    assert.match(mobile, /closeButton\.current\?\.focus\(\)/);
    assert.match(mobile, /e\.key === 'Escape'/);
    assert.match(mobile, /e\.key !== 'Tab'[\s\S]*last\?\.focus\(\)[\s\S]*first\?\.focus\(\)/);
    assert.match(mobile, /menuButton\.current\?\.focus\(\)/);
  });

  it('closes after navigation or when the screen grows to desktop, and unlocks scrolling', () => {
    assert.match(mobile, /useEffect\(\(\) => setOpen\(false\), \[pathname\]\)/);
    assert.match(mobile, /window\.matchMedia\(DESKTOP_QUERY\)\.matches && setOpen\(false\)/);
    assert.match(mobile, /const DESKTOP_QUERY = '\(min-width: 1024px\)'/);
    assert.match(mobile, /document\.body\.style\.overflow = overflow;/);
  });

  it('has touch targets of at least 44 px', () => {
    assert.match(mobile, /min-h-14 flex-col/);
    assert.match(mobile, /flex min-h-11 items-center gap-3/);
    assert.match(mobile, /h-11 w-11/);
  });
});

describe('the compact top bar', () => {
  it('stays on one row below lg and keeps the desktop spacing from lg up', () => {
    assert.match(shell('topbar.tsx'), /min-h-14 [^"]*lg:min-h-16 lg:flex-wrap lg:gap-3 lg:py-3/);
  });

  it('keeps company switching, search, notifications and the account menu', () => {
    const topbar = shell('topbar.tsx');
    for (const part of ['<CompanySwitcher />', '<CommandPalette role={role} />', '<NotificationBell />', '<UserMenu role={role} />']) {
      assert.ok(topbar.includes(part), part);
    }
    assert.match(shell('company-switcher.tsx'), /id="maos-company-picker"[\s\S]*max-w-full [^"]*sm:max-w-\[18rem\]/);
  });

  it('icon-only controls keep an accessible name', () => {
    assert.match(shell('command-palette.tsx'), /aria-label="Search \(Command K\)"/);
    assert.match(shell('user-menu.tsx'), /aria-label=\{`Account: \$\{displayName\}`\}/);
  });
});

describe('ready for RTL, German and English', () => {
  it('uses logical (start/end) classes only in the mobile navigation and top bar', () => {
    const physical = /\b(?:ml|mr|pl|pr|left|right|border-l|border-r|rounded-l|rounded-r)-|\btext-(?:left|right)\b/;
    for (const f of ['compact-nav.tsx', 'topbar.tsx', 'company-switcher.tsx', 'user-menu.tsx']) {
      assert.doesNotMatch(shell(f), physical, f);
    }
    assert.match(mobile, /absolute inset-y-0 start-0/);
  });

  it('truncates labels instead of overflowing and keeps its strings in one place', () => {
    assert.match(mobile, /const labels = \{/);
    assert.equal((mobile.match(/max-w-full truncate/g) ?? []).length, 2);
    assert.match(mobile, /min-w-0 truncate">\{item\.label\}/);
  });
});
