import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const readApi = (relativePath) => readFileSync(join(apiRoot, relativePath), 'utf8');
const existsApi = (relativePath) => existsSync(join(apiRoot, relativePath));

describe('Sprint 3 projects, tasks, and subtasks API baseline', () => {
  it('adds project, project member, task, and subtask data models', () => {
    const schema = readApi('prisma/schema.prisma');
    const models = ['Project', 'ProjectMember', 'Task', 'Subtask'];
    const enums = ['ProjectStatus', 'TaskStatus', 'TaskPriority'];

    for (const model of models) {
      assert.match(schema, new RegExp(`model ${model} \\{`));
    }

    for (const prismaEnum of enums) {
      assert.match(schema, new RegExp(`enum ${prismaEnum} \\{`));
    }
  });

  it('keeps Sprint 3 tenant-owned models tenant-scoped', () => {
    const schema = readApi('prisma/schema.prisma');
    const tenantOwnedModels = ['Project', 'ProjectMember', 'Task', 'Subtask'];

    for (const model of tenantOwnedModels) {
      const block = schema.match(new RegExp(`model ${model} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? '';
      assert.match(block, /tenantId\s+String/);
      assert.match(block, /@@index\(\[tenantId/);
    }
  });

  it('adds projects, tasks, and subtasks modules with REST-first endpoint skeletons', () => {
    const requiredFiles = [
      'src/modules/projects/projects.controller.ts',
      'src/modules/projects/projects.service.ts',
      'src/modules/projects/projects.repository.ts',
      'src/modules/tasks/tasks.controller.ts',
      'src/modules/tasks/tasks.service.ts',
      'src/modules/tasks/tasks.repository.ts',
      'src/modules/subtasks/subtasks.controller.ts',
      'src/modules/subtasks/subtasks.service.ts',
      'src/modules/subtasks/subtasks.repository.ts',
    ];

    for (const file of requiredFiles) {
      assert.equal(existsApi(file), true, `${file} should exist`);
    }

    const projectsController = readApi('src/modules/projects/projects.controller.ts');
    const tasksController = readApi('src/modules/tasks/tasks.controller.ts');
    const subtasksController = readApi('src/modules/subtasks/subtasks.controller.ts');

    assert.match(projectsController, /@Controller\('projects'\)/);
    assert.match(projectsController, /@Get\(\)/);
    assert.match(projectsController, /@Post\(\)/);
    assert.match(projectsController, /@Get\(':id'\)/);
    assert.match(projectsController, /@Patch\(':id'\)/);
    assert.match(tasksController, /@Controller\('tasks'\)/);
    assert.match(tasksController, /@Get\(\)/);
    assert.match(tasksController, /@Post\(\)/);
    assert.match(tasksController, /@Get\(':id'\)/);
    assert.match(tasksController, /@Patch\(':id'\)/);
    assert.match(subtasksController, /@Get\('tasks\/:taskId\/subtasks'\)/);
    assert.match(subtasksController, /@Post\('tasks\/:taskId\/subtasks'\)/);
    assert.match(subtasksController, /@Patch\('subtasks\/:id'\)/);
  });

  it('uses permission guard and project/task/subtask permission resources on protected routes', () => {
    const files = [
      readApi('src/modules/projects/projects.controller.ts'),
      readApi('src/modules/tasks/tasks.controller.ts'),
      readApi('src/modules/subtasks/subtasks.controller.ts'),
    ].join('\n');
    const permissionTypes = readApi('src/modules/permissions/permission.types.ts');

    assert.match(files, /@UseGuards\(PermissionGuard\)/);
    assert.match(files, /RequirePermission/);
    assert.match(permissionTypes, /PROJECT/);
    assert.match(permissionTypes, /TASK/);
    assert.match(permissionTypes, /SUBTASK/);
  });

  it('requires tenant context in Sprint 3 repositories', () => {
    const repositories = [
      readApi('src/modules/projects/projects.repository.ts'),
      readApi('src/modules/tasks/tasks.repository.ts'),
      readApi('src/modules/subtasks/subtasks.repository.ts'),
    ].join('\n');

    assert.match(repositories, /extends TenantAwareRepository/);
    assert.match(repositories, /requireTenantContext/);
    assert.doesNotMatch(repositories, /\.project\./);
    assert.doesNotMatch(repositories, /\.task\./);
    assert.doesNotMatch(repositories, /\.subtask\./);
  });

  it('creates audit placeholders for project, task, and subtask changes', () => {
    const services = [
      readApi('src/modules/projects/projects.service.ts'),
      readApi('src/modules/tasks/tasks.service.ts'),
      readApi('src/modules/subtasks/subtasks.service.ts'),
    ].join('\n');

    assert.match(services, /project\.created/);
    assert.match(services, /project\.updated/);
    assert.match(services, /task\.created/);
    assert.match(services, /task\.updated/);
    assert.match(services, /subtask\.created/);
    assert.match(services, /subtask\.updated/);
    assert.match(services, /createAuditEventPlaceholder/);
  });

  it('keeps post-Sprint-5 deferred modules absent from apps/api modules', () => {
    const appModule = readApi('src/app.module.ts');

    assert.doesNotMatch(appModule, /AiModule/);
    assert.doesNotMatch(appModule, /AutomationsModule/);
  });
});
