import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
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

  return readdirSync(absolutePath).flatMap((entry) => {
    const childPath = join(relativePath, entry);
    const fullPath = join(webRoot, childPath);

    if (statSync(fullPath).isDirectory()) {
      return listFiles(childPath);
    }

    return [childPath];
  });
}

describe('Sprint 6 files, file versioning, and approvals frontend baseline', () => {
  it('adds files and approvals workspace pages', () => {
    const routes = [
      'app/(workspace)/files/page.tsx',
      'app/(workspace)/files/[id]/page.tsx',
      'app/(workspace)/approvals/page.tsx',
      'app/(workspace)/approvals/[id]/page.tsx',
    ];

    for (const route of routes) {
      assert.equal(existsWeb(route), true, `${route} should exist`);
    }
  });

  it('adds required file and approval components', () => {
    const components = [
      'src/components/files/file-list.tsx',
      'src/components/files/file-detail.tsx',
      'src/components/files/file-version-list.tsx',
      'src/components/files/file-visibility-badge.tsx',
      'src/components/files/signed-url-notice.tsx',
      'src/components/approvals/approval-list.tsx',
      'src/components/approvals/approval-detail.tsx',
      'src/components/approvals/approval-status-badge.tsx',
      'src/components/approvals/approval-decision-panel.tsx',
    ];

    for (const component of components) {
      assert.equal(existsWeb(component), true, `${component} should exist`);
    }
  });

  it('adds internal navigation for files and approvals without exposing them to clients', () => {
    const workspaceNavigation = readWeb('src/navigation/navigation.ts');
    const clientNavigation = readWeb('src/navigation/client-navigation.ts');

    assert.match(workspaceNavigation, /id: 'files'/);
    assert.match(workspaceNavigation, /href: '\/files'/);
    assert.match(workspaceNavigation, /id: 'approvals'/);
    assert.match(workspaceNavigation, /href: '\/approvals'/);
    assert.match(workspaceNavigation, /allowedRoles: \['OWNER', 'MANAGER', 'EMPLOYEE'\]/);
    assert.doesNotMatch(clientNavigation, /files/i);
    assert.doesNotMatch(clientNavigation, /approvals/i);
  });

  it('keeps file and approval features out of client portal source', () => {
    const clientFiles = listFiles('app/(client)')
      .concat(listFiles('src/components/client-portal'))
      .map((file) => readWeb(file))
      .join('\n');

    assert.doesNotMatch(clientFiles, /\/files/);
    assert.doesNotMatch(clientFiles, /\/approvals/);
    assert.doesNotMatch(clientFiles, /FileList/);
    assert.doesNotMatch(clientFiles, /ApprovalList/);
  });

  it('keeps deferred non-Sprint-6 features absent from new workspace source', () => {
    const sprint6Files = listFiles('app/(workspace)/files')
      .concat(listFiles('app/(workspace)/approvals'))
      .concat(listFiles('src/components/files'))
      .concat(listFiles('src/components/approvals'))
      .map((file) => readWeb(file))
      .join('\n');

    assert.doesNotMatch(sprint6Files, /finance/i);
    assert.doesNotMatch(sprint6Files, /\bAI\b/);
    assert.doesNotMatch(sprint6Files, /report/i);
    assert.doesNotMatch(sprint6Files, /automation/i);
    assert.doesNotMatch(sprint6Files, /client chat/i);
  });
});
