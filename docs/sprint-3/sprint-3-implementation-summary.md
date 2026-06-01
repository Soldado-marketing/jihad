# Sprint 3 Implementation Summary

## Files Created

### API

- `apps/api/src/common/http/request-context.ts`
- `apps/api/src/modules/projects/dto/create-project.dto.ts`
- `apps/api/src/modules/projects/dto/update-project.dto.ts`
- `apps/api/src/modules/projects/projects.controller.ts`
- `apps/api/src/modules/projects/projects.module.ts`
- `apps/api/src/modules/projects/projects.repository.ts`
- `apps/api/src/modules/projects/projects.service.ts`
- `apps/api/src/modules/tasks/dto/create-task.dto.ts`
- `apps/api/src/modules/tasks/dto/update-task.dto.ts`
- `apps/api/src/modules/tasks/tasks.controller.ts`
- `apps/api/src/modules/tasks/tasks.module.ts`
- `apps/api/src/modules/tasks/tasks.repository.ts`
- `apps/api/src/modules/tasks/tasks.service.ts`
- `apps/api/src/modules/subtasks/dto/create-subtask.dto.ts`
- `apps/api/src/modules/subtasks/dto/update-subtask.dto.ts`
- `apps/api/src/modules/subtasks/subtasks.controller.ts`
- `apps/api/src/modules/subtasks/subtasks.module.ts`
- `apps/api/src/modules/subtasks/subtasks.repository.ts`
- `apps/api/src/modules/subtasks/subtasks.service.ts`
- `apps/api/test/sprint-3-baseline.test.mjs`

### Web

- `apps/web/app/(workspace)/projects/page.tsx`
- `apps/web/app/(workspace)/projects/[id]/page.tsx`
- `apps/web/app/(workspace)/tasks/page.tsx`
- `apps/web/app/(workspace)/tasks/[id]/page.tsx`
- `apps/web/src/components/projects/project-list.tsx`
- `apps/web/src/components/projects/project-detail.tsx`
- `apps/web/src/components/tasks/task-list.tsx`
- `apps/web/src/components/tasks/task-detail.tsx`
- `apps/web/src/components/tasks/subtask-list.tsx`
- `apps/web/src/components/tasks/status-badge.tsx`
- `apps/web/test/sprint-3-baseline.test.mjs`

### Documentation

- `docs/sprint-3/sprint-3-implementation-summary.md`

## Files Modified

- `apps/api/prisma/schema.prisma`
- `apps/api/src/app.module.ts`
- `apps/api/src/modules/permissions/permission.types.ts`
- `apps/web/src/navigation/navigation.ts`
- `apps/web/test/sprint-2-baseline.test.mjs`

## Packages Installed

- None.

## Data Models Added

- `Project`
- `ProjectMember`
- `Task`
- `Subtask`
- `ProjectStatus`
- `TaskStatus`
- `TaskPriority`

Tenant-owned Sprint 3 models include `tenantId`.

## Endpoints Added

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PATCH /api/projects/:id`
- `GET /api/tasks`
- `POST /api/tasks`
- `GET /api/tasks/:id`
- `PATCH /api/tasks/:id`
- `GET /api/tasks/:taskId/subtasks`
- `POST /api/tasks/:taskId/subtasks`
- `PATCH /api/subtasks/:id`

Endpoints use `PermissionGuard`, `RequirePermission`, tenant context headers, DTO validation classes, tenant-aware repositories, service-layer scope validation, and audit placeholders.

## Frontend Pages Added

- `/projects`
- `/projects/[id]`
- `/tasks`
- `/tasks/[id]`

## Components Added

- `ProjectList`
- `ProjectDetail`
- `TaskList`
- `TaskDetail`
- `SubtaskList`
- `StatusBadge`

## Navigation Added

- Projects navigation for Owner, Manager, and Employee.
- Tasks navigation for Owner, Manager, and Employee.
- Client navigation remains placeholder-only and does not expose Projects or Tasks.

## Tests Added

- API Sprint 3 baseline tests for models, tenant scoping, modules, endpoints, permission guard usage, tenant-aware repository enforcement, audit placeholders, and non-Sprint-3 module absence.
- Web Sprint 3 baseline tests for pages, components, navigation, client portal absence, and advanced module absence.
- Sprint 2 web test updated so it does not block intentional Sprint 3 project/task additions.

## What Is Intentionally Not Implemented

- Client portal.
- CRM.
- Finance.
- AI.
- Reports.
- Automations.
- File uploads.
- Approvals.
- Advanced task dependencies.
- Workload balancer.
- Recurring tasks.
- Project templates.
- Skill matching.
- Persistent project/task database writes.
- Prisma migrations or SQL scripts.

## Remaining Sprint 3 Blockers

- None for the requested Sprint 3 core baseline scope.

## Completion Status

- Sprint 3 is complete for Projects, Tasks, and Subtasks Core baseline.

## Validation Results

- `apps/api npm run build`: Passed.
- `apps/api npm test`: Passed, 19 tests.
- `apps/api npm run prisma:validate`: Passed.
- `apps/web npm run build`: Passed.
- `apps/web npm test`: Passed, 10 tests.
- Browser preview check for `/projects`: Passed.
