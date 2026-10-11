import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { assertGuardedController } from './support/source-assertions.mjs';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const readApi = (relativePath) => readFileSync(join(apiRoot, relativePath), 'utf8');
const existsApi = (relativePath) => existsSync(join(apiRoot, relativePath));

describe('Sprint 4 client portal API boundary baseline', () => {
  it('adds client visibility placeholders to project and task resources', () => {
    const schema = readApi('prisma/schema.prisma');
    const projectBlock = schema.match(/model Project \{([\s\S]*?)\n\}/)?.[1] ?? '';
    const taskBlock = schema.match(/model Task \{([\s\S]*?)\n\}/)?.[1] ?? '';

    for (const block of [projectBlock, taskBlock]) {
      assert.match(block, /clientVisible\s+Boolean\s+@default\(false\)/);
      assert.match(block, /clientScopeKey\s+String\?/);
      assert.match(block, /@@index\(\[tenantId, clientVisible\]\)/);
      assert.match(block, /@@index\(\[tenantId, clientScopeKey\]\)/);
    }
  });

  it('adds separate client portal module and REST endpoint skeletons', () => {
    const files = [
      'src/modules/client-portal/client-portal.module.ts',
      'src/modules/client-portal/client-portal.controller.ts',
      'src/modules/client-portal/client-portal.service.ts',
    ];

    for (const file of files) {
      assert.equal(existsApi(file), true, `${file} should exist`);
    }

    const controller = readApi('src/modules/client-portal/client-portal.controller.ts');

    assert.match(controller, /@Controller\('client'\)/);
    assert.match(controller, /@Get\('projects'\)/);
    assert.match(controller, /@Get\('projects\/:id'\)/);
    assert.match(controller, /@Get\('tasks'\)/);
    assert.match(controller, /@Get\('tasks\/:id'\)/);
  });

  it('uses permission guard and client-portal scoped read permissions', () => {
    const controller = readApi('src/modules/client-portal/client-portal.controller.ts');
    const permissionService = readApi('src/modules/permissions/permission.service.ts');

    // MAOS-T39: authentication first, then the client-portal read grant;
    // a CLIENT is denied every non-portal route.
    assertGuardedController(assert, controller, 'client-portal.controller.ts');
    const routes = controller.match(/@RequirePermission\([^)]*\)/g) ?? [];
    assert.equal(routes.length, 4);
    for (const route of routes) assert.match(route, /scope: 'client-portal'/);
    assert.match(permissionService, /requirement\.scope === 'client-portal' && action === PermissionAction\.READ && !sensitive/);
    assert.match(permissionService, /client_non_portal_deny/);
  });

  it('keeps client-safe return types free from internal-only fields', () => {
    // MAOS-T39: the ClientSafeProject/ClientSafeTask types no longer exist, so
    // this check used to pass on empty strings. It now inspects the selects
    // the portal actually returns.
    const service = readApi('src/modules/client-portal/client-portal.service.ts');
    const selects = service.match(/select: \{[^}]*\}/g) ?? [];
    assert.equal(selects.length, 4, 'every portal query uses an explicit select');

    for (const typeBlock of selects) {
      assert.doesNotMatch(typeBlock, /audit/i);
      assert.doesNotMatch(typeBlock, /finance/i);
      assert.doesNotMatch(typeBlock, /payroll/i);
      assert.doesNotMatch(typeBlock, /employee/i);
      assert.doesNotMatch(typeBlock, /internal/i);
      assert.doesNotMatch(typeBlock, /ai/i);
      assert.doesNotMatch(typeBlock, /report/i);
    }
  });

  it('returns no audit data from the client portal', () => {
    const service = readApi('src/modules/client-portal/client-portal.service.ts');
    assert.doesNotMatch(service, /auditEvent/i);
  });

  it.todo('writes audit events for client portal access and views (specified in Sprint 4, never built; backlog F-4)');

  it('keeps client routes separate from internal project and task controllers', () => {
    const projectsController = readApi('src/modules/projects/projects.controller.ts');
    const tasksController = readApi('src/modules/tasks/tasks.controller.ts');
    const appModule = readApi('src/app.module.ts');

    assert.match(appModule, /ClientPortalModule/);
    assert.doesNotMatch(projectsController, /scope: 'client-portal'/);
    assert.doesNotMatch(tasksController, /scope: 'client-portal'/);
  });

  it('keeps post-Sprint-5 deferred modules absent from apps/api modules', () => {
    const appModule = readApi('src/app.module.ts');

    assert.doesNotMatch(appModule, /AiModule/);
    assert.doesNotMatch(appModule, /AutomationsModule/);
  });
});
