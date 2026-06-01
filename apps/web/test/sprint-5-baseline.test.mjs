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

describe('Sprint 5 CRM basic and collaboration frontend baseline', () => {
  it('adds CRM and collaboration workspace pages', () => {
    const routes = [
      'app/(workspace)/crm/page.tsx',
      'app/(workspace)/crm/leads/page.tsx',
      'app/(workspace)/crm/leads/[id]/page.tsx',
      'app/(workspace)/crm/opportunities/page.tsx',
      'app/(workspace)/crm/opportunities/[id]/page.tsx',
      'app/(workspace)/crm/meetings/page.tsx',
      'app/(workspace)/crm/follow-ups/page.tsx',
      'app/(workspace)/collaboration/page.tsx',
    ];

    for (const route of routes) {
      assert.equal(existsWeb(route), true, `${route} should exist`);
    }
  });

  it('adds required CRM and collaboration components', () => {
    const components = [
      'src/components/crm/crm-overview.tsx',
      'src/components/crm/lead-list.tsx',
      'src/components/crm/lead-detail.tsx',
      'src/components/crm/opportunity-list.tsx',
      'src/components/crm/opportunity-detail.tsx',
      'src/components/crm/pipeline-badge.tsx',
      'src/components/crm/meeting-list.tsx',
      'src/components/crm/follow-up-list.tsx',
      'src/components/collaboration/internal-notes-panel.tsx',
    ];

    for (const component of components) {
      assert.equal(existsWeb(component), true, `${component} should exist`);
    }
  });

  it('adds internal navigation for CRM and collaboration without exposing them to clients', () => {
    const workspaceNavigation = readWeb('src/navigation/navigation.ts');
    const clientNavigation = readWeb('src/navigation/client-navigation.ts');

    assert.match(workspaceNavigation, /id: 'crm'/);
    assert.match(workspaceNavigation, /href: '\/crm'/);
    assert.match(workspaceNavigation, /allowedRoles: \['OWNER', 'MANAGER'\]/);
    assert.match(workspaceNavigation, /id: 'collaboration'/);
    assert.match(workspaceNavigation, /allowedRoles: \['OWNER', 'MANAGER', 'EMPLOYEE'\]/);
    assert.doesNotMatch(clientNavigation, /crm/i);
    assert.doesNotMatch(clientNavigation, /collaboration/i);
  });

  it('keeps CRM and collaboration out of client portal source', () => {
    const clientFiles = listFiles('app/(client)')
      .concat(listFiles('src/components/client-portal'))
      .map((file) => readWeb(file))
      .join('\n');

    assert.doesNotMatch(clientFiles, /crm/i);
    assert.doesNotMatch(clientFiles, /collaboration/i);
    assert.doesNotMatch(clientFiles, /\/crm\/leads/i);
    assert.doesNotMatch(clientFiles, /\/crm\/opportunities/i);
    assert.doesNotMatch(clientFiles, /LeadList/);
    assert.doesNotMatch(clientFiles, /OpportunityList/);
  });

  it('keeps deferred non-Sprint-5 features absent from new workspace source', () => {
    const sprint5Files = listFiles('app/(workspace)/crm')
      .concat(listFiles('app/(workspace)/collaboration'))
      .concat(listFiles('src/components/crm'))
      .concat(listFiles('src/components/collaboration'))
      .map((file) => readWeb(file))
      .join('\n');

    assert.doesNotMatch(sprint5Files, /file upload/i);
    assert.doesNotMatch(sprint5Files, /finance/i);
    assert.doesNotMatch(sprint5Files, /\bAI\b/);
    assert.doesNotMatch(sprint5Files, /report/i);
    assert.doesNotMatch(sprint5Files, /automation/i);
  });
});
