import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { assertGuardedController, assertTenantScopedRepository } from './support/source-assertions.mjs';

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
    const paths = [
      'src/modules/projects/projects.controller.ts',
      'src/modules/tasks/tasks.controller.ts',
      'src/modules/subtasks/subtasks.controller.ts',
    ];
    const permissionTypes = readApi('src/modules/permissions/permission.types.ts');

    for (const path of paths) assertGuardedController(assert, readApi(path), path);
    assert.match(permissionTypes, /PROJECT/);
    assert.match(permissionTypes, /TASK/);
    assert.match(permissionTypes, /SUBTASK/);
  });

  it('requires tenant context in Sprint 3 repositories', () => {
    // MAOS-T39: every query carries a tenantId boundary (see support helper).
    for (const path of [
      'src/modules/projects/projects.repository.ts',
      'src/modules/tasks/tasks.repository.ts',
      'src/modules/subtasks/subtasks.repository.ts',
    ]) {
      assertTenantScopedRepository(assert, readApi(path), path);
    }
  });

  it.todo('writes audit events for project, task and subtask changes (specified in Sprint 3, never built; backlog F-4)');

  it('keeps post-Sprint-5 deferred modules absent from apps/api modules', () => {
    const appModule = readApi('src/app.module.ts');

    assert.doesNotMatch(appModule, /AiModule/);
    assert.doesNotMatch(appModule, /AutomationsModule/);
  });
});
