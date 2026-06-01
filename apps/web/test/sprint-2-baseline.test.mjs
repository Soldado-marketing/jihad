import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const readWeb = (relativePath) => readFileSync(join(webRoot, relativePath), 'utf8');
const existsWeb = (relativePath) => existsSync(join(webRoot, relativePath));

function listFiles(relativePath) {
  const absolutePath = join(webRoot, relativePath);
  if (!existsSync(absolutePath)) {
    return [];
  }

  return readdirSync(absolutePath, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
}

describe('Sprint 2 workspace shell and navigation baseline', () => {
  it('creates the MAOS apps/web Next.js baseline without relying on the root app', () => {
    assert.equal(existsWeb('package.json'), true);
    assert.equal(existsWeb('app/layout.tsx'), true);
    assert.equal(existsWeb('tailwind.config.ts'), true);

    const packageJson = readWeb('package.json');
    assert.match(packageJson, /"next": "15\.5\.15"/);
    assert.match(packageJson, /"react": "19\.2\.0"/);
    assert.match(packageJson, /"typescript"/);
  });

  it('adds the required shell and state components', () => {
    const requiredFiles = [
      'src/components/shell/app-shell.tsx',
      'src/components/shell/sidebar.tsx',
      'src/components/shell/topbar.tsx',
      'src/components/shell/user-menu.tsx',
      'src/components/shell/workspace-content.tsx',
      'src/components/states/denied-state.tsx',
      'src/components/states/unauthorized-state.tsx',
      'src/components/states/loading-state.tsx',
      'src/components/states/empty-state.tsx',
    ];

    for (const file of requiredFiles) {
      assert.equal(existsWeb(file), true, `${file} should exist`);
    }
  });

  it('creates workspace, auth, settings, dashboard, denied, and unauthorized routes', () => {
    const routes = [
      'app/(workspace)/layout.tsx',
      'app/(workspace)/dashboard/page.tsx',
      'app/(workspace)/settings/page.tsx',
      'app/(workspace)/denied/page.tsx',
      'app/(auth)/auth/login/page.tsx',
      'app/(auth)/auth/invite/page.tsx',
      'app/(auth)/unauthorized/page.tsx',
    ];

    for (const route of routes) {
      assert.equal(existsWeb(route), true, `${route} should exist`);
    }
  });

  it('adds role-aware navigation while deferring the client portal route', () => {
    const navigation = readWeb('src/navigation/navigation.ts');
    const permissions = readWeb('src/security/ui-permissions.ts');

    assert.match(navigation, /OWNER/);
    assert.match(navigation, /MANAGER/);
    assert.match(navigation, /EMPLOYEE/);
    assert.match(navigation, /CLIENT/);
    assert.match(navigation, /client-placeholder/);
    assert.match(navigation, /sprint2Status: 'deferred'/);
    assert.match(permissions, /Backend guards remain the source of truth/);

    const routeFiles = listFiles('app').join('\n');
    assert.doesNotMatch(routeFiles, /client-portal/i);
  });

  it('adds RTL/LTR and API health placeholder helpers', () => {
    const direction = readWeb('src/i18n/direction.ts');
    const health = readWeb('src/api/health.ts');

    assert.match(direction, /'ar'/);
    assert.match(direction, /'rtl'/);
    assert.match(direction, /'en'/);
    assert.match(direction, /'de'/);
    assert.match(direction, /'ltr'/);
    assert.match(health, /\/api\/health/);
    assert.match(health, /placeholder only/);
  });

  it('does not introduce deferred non-Sprint-2 business modules', () => {
    const files = [
      readWeb('src/api/health.ts'),
      readWeb('src/i18n/direction.ts'),
      readWeb('src/navigation/navigation.ts'),
      readWeb('src/security/ui-permissions.ts'),
    ].join('\n');

    assert.doesNotMatch(files, /automation/i);
  });
});
