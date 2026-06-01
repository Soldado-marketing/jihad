import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const readWeb = (relativePath) => readFileSync(join(webRoot, relativePath), 'utf8');
const existsWeb = (relativePath) => existsSync(join(webRoot, relativePath));

describe('Sprint 3 projects, tasks, and subtasks frontend baseline', () => {
  it('adds project and task workspace pages without client portal routes', () => {
    const routes = [
      'app/(workspace)/projects/page.tsx',
      'app/(workspace)/projects/[id]/page.tsx',
      'app/(workspace)/tasks/page.tsx',
      'app/(workspace)/tasks/[id]/page.tsx',
    ];

    for (const route of routes) {
      assert.equal(existsWeb(route), true, `${route} should exist`);
    }

    assert.equal(existsWeb('app/(client)/portal/page.tsx'), false);
    assert.equal(existsWeb('app/client-portal/page.tsx'), false);
  });

  it('adds required project/task/subtask components', () => {
    const components = [
      'src/components/projects/project-list.tsx',
      'src/components/projects/project-detail.tsx',
      'src/components/tasks/task-list.tsx',
      'src/components/tasks/task-detail.tsx',
      'src/components/tasks/subtask-list.tsx',
      'src/components/tasks/status-badge.tsx',
    ];

    for (const component of components) {
      assert.equal(existsWeb(component), true, `${component} should exist`);
    }
  });

  it('updates internal navigation for Owner, Manager, and Employee only', () => {
    const navigation = readWeb('src/navigation/navigation.ts');

    assert.match(navigation, /id: 'projects'/);
    assert.match(navigation, /id: 'tasks'/);
    assert.match(navigation, /allowedRoles: \['OWNER', 'MANAGER', 'EMPLOYEE'\]/);
    assert.doesNotMatch(navigation, /allowedRoles: \['CLIENT'.*projects/s);
    assert.doesNotMatch(navigation, /allowedRoles: \['CLIENT'.*tasks/s);
  });

  it('keeps advanced non-Sprint-3 modules absent from apps/web source', () => {
    const source = [
      readWeb('app/(workspace)/projects/page.tsx'),
      readWeb('app/(workspace)/tasks/page.tsx'),
    ].join('\n');

    assert.doesNotMatch(source, /automation/i);
    assert.doesNotMatch(source, /AI analyst/i);
    assert.doesNotMatch(source, /CRM pipeline/i);
  });
});
