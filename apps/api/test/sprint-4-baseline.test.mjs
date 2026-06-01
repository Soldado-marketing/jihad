import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

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

    assert.match(controller, /@UseGuards\(PermissionGuard\)/);
    assert.match(controller, /RequirePermission/);
    assert.match(controller, /scope: 'client-portal'/);
    assert.match(permissionService, /isClientPortalRead/);
    assert.match(permissionService, /client_own_client_visible_scope_placeholder/);
  });

  it('keeps client-safe return types free from internal-only fields', () => {
    const service = readApi('src/modules/client-portal/client-portal.service.ts');
    const projectType = service.match(/export type ClientSafeProject = \{([\s\S]*?)\n\};/)?.[1] ?? '';
    const taskType = service.match(/export type ClientSafeTask = \{([\s\S]*?)\n\};/)?.[1] ?? '';

    for (const typeBlock of [projectType, taskType]) {
      assert.doesNotMatch(typeBlock, /audit/i);
      assert.doesNotMatch(typeBlock, /finance/i);
      assert.doesNotMatch(typeBlock, /payroll/i);
      assert.doesNotMatch(typeBlock, /employee/i);
      assert.doesNotMatch(typeBlock, /internal/i);
      assert.doesNotMatch(typeBlock, /ai/i);
      assert.doesNotMatch(typeBlock, /report/i);
    }
  });

  it('adds audit placeholders for client portal access and views without returning audit data', () => {
    const service = readApi('src/modules/client-portal/client-portal.service.ts');

    assert.match(service, /client\.portal\.accessed/);
    assert.match(service, /client\.project\.viewed/);
    assert.match(service, /client\.task\.viewed/);
    assert.match(service, /createAuditEventPlaceholder/);
    assert.doesNotMatch(service, /return \{[^}]*auditEvent/s);
  });

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
