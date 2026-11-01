import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const readWeb = (relativePath) => readFileSync(join(webRoot, relativePath), 'utf8');
const existsWeb = (relativePath) => existsSync(join(webRoot, relativePath));

function listFiles(relativePath, basePath = relativePath) {
  const absolutePath = join(webRoot, relativePath);
  if (!existsSync(absolutePath)) {
    return [];
  }

  return readdirSync(absolutePath).flatMap((entry) => {
    const childPath = join(relativePath, entry);
    const fullPath = join(webRoot, childPath);

    if (statSync(fullPath).isDirectory()) {
      return listFiles(childPath, basePath);
    }

    return [childPath];
  });
}

describe('Sprint 4 client portal frontend boundary baseline', () => {
  it('adds client portal route group pages', () => {
    const routes = [
      'app/(client)/client/layout.tsx',
      'app/(client)/client/page.tsx',
      'app/(client)/client/projects/page.tsx',
      'app/(client)/client/projects/[id]/page.tsx',
      'app/(client)/client/tasks/page.tsx',
      'app/(client)/client/tasks/[id]/page.tsx',
    ];

    for (const route of routes) {
      assert.equal(existsWeb(route), true, `${route} should exist`);
    }
  });

  it('adds required client portal components', () => {
    const components = [
      'src/components/client-portal/client-shell.tsx',
      'src/components/client-portal/client-sidebar.tsx',
      'src/components/client-portal/client-topbar.tsx',
      'src/components/client-portal/client-dashboard.tsx',
      'src/components/client-portal/client-project-list.tsx',
      'src/components/client-portal/client-project-detail.tsx',
      'src/components/client-portal/client-task-list.tsx',
      'src/components/client-portal/client-task-detail.tsx',
      'src/components/client-portal/client-safe-notice.tsx',
    ];

    for (const component of components) {
      assert.equal(existsWeb(component), true, `${component} should exist`);
    }
  });

  it('lets a client sign out from the portal with the shared account menu', () => {
    const topbar = readWeb('src/components/client-portal/client-topbar.tsx');

    assert.match(topbar, /import \{ UserMenu \} from '@\/components\/shell\/user-menu'/);
    assert.match(topbar, /<UserMenu role="CLIENT" \/>/);
  });

  it('keeps client navigation separate from internal workspace navigation', () => {
    const clientNavigation = readWeb('src/navigation/client-navigation.ts');
    const workspaceNavigation = readWeb('src/navigation/navigation.ts');

    assert.match(clientNavigation, /\/client/);
    assert.match(clientNavigation, /\/client\/projects/);
    assert.match(clientNavigation, /\/client\/tasks/);
    assert.doesNotMatch(workspaceNavigation, /href: '\/client'/);
    assert.doesNotMatch(workspaceNavigation, /href: '\/client\/projects'/);
    assert.doesNotMatch(workspaceNavigation, /href: '\/client\/tasks'/);
  });

  it('does not expose internal-only labels in client portal source', () => {
    const clientFiles = listFiles('app/(client)')
      .concat(listFiles('src/components/client-portal'))
      .map((file) => readWeb(file))
      .join('\n');

    assert.doesNotMatch(clientFiles, /audit/i);
    assert.doesNotMatch(clientFiles, /payroll/i);
    assert.doesNotMatch(clientFiles, /employee cost/i);
    assert.doesNotMatch(clientFiles, /admin/i);
    assert.doesNotMatch(clientFiles, /\bAI\b/);
    assert.doesNotMatch(clientFiles, /reports/i);
  });

  it('keeps non-Sprint-4 features absent from client portal pages', () => {
    const clientFiles = listFiles('app/(client)')
      .map((file) => readWeb(file))
      .join('\n');

    assert.doesNotMatch(clientFiles, /file upload/i);
    // MAOS-T39: copy may mention approval ("tasks for review or approval");
    // what must stay absent is any approvals feature in the portal.
    assert.doesNotMatch(clientFiles, /\/approvals|ApprovalRequest|approvalRequest/);
    assert.doesNotMatch(clientFiles, /chat/i);
    assert.doesNotMatch(clientFiles, /crm/i);
    assert.doesNotMatch(clientFiles, /automation/i);
  });
});
