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
    // Phase 6 gives clients access to approved, client-visible files through the
    // client-portal route. The invariant is no longer "no files in the client
    // nav" but "no INTERNAL route in the client nav": every client entry must
    // sit under /client, and the internal /files and /approvals routes must not
    // appear at all.
    for (const href of clientNavigation.matchAll(/href: '([^']+)'/g)) {
      assert.match(href[1], /^\/client(\/|$)/, `client nav entry ${href[1]} is not a /client route`);
    }
    assert.doesNotMatch(clientNavigation, /href: '\/files'/);
    assert.doesNotMatch(clientNavigation, /approvals/i);
  });

  it('keeps file and approval features out of client portal source', () => {
    const clientFiles = listFiles('app/(client)')
      .concat(listFiles('src/components/client-portal'))
      .map((file) => readWeb(file))
      .join('\n');

    // The client portal may call its own /client/files route (Phase 6: a client
    // can open an approved, client-visible file). It must never call the
    // internal file or approval routes, or reuse the internal components.
    assert.doesNotMatch(clientFiles, /(?<!\/client)\/files/);
    assert.doesNotMatch(clientFiles, /\/approvals/);
    assert.doesNotMatch(clientFiles, /FileList/);
    assert.doesNotMatch(clientFiles, /ApprovalList/);
    // Storage internals stay server-side on this route as well.
    assert.doesNotMatch(clientFiles, /storageKey|getSignedUrl|presign|s3\.amazonaws/i);
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
