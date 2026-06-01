# Sprint 4 Implementation Summary

## Files Created

- `apps/api/src/modules/client-portal/client-portal.controller.ts`
- `apps/api/src/modules/client-portal/client-portal.module.ts`
- `apps/api/src/modules/client-portal/client-portal.service.ts`
- `apps/api/test/sprint-4-baseline.test.mjs`
- `apps/web/app/(client)/client/layout.tsx`
- `apps/web/app/(client)/client/page.tsx`
- `apps/web/app/(client)/client/projects/page.tsx`
- `apps/web/app/(client)/client/projects/[id]/page.tsx`
- `apps/web/app/(client)/client/tasks/page.tsx`
- `apps/web/app/(client)/client/tasks/[id]/page.tsx`
- `apps/web/src/components/client-portal/client-dashboard.tsx`
- `apps/web/src/components/client-portal/client-project-detail.tsx`
- `apps/web/src/components/client-portal/client-project-list.tsx`
- `apps/web/src/components/client-portal/client-safe-notice.tsx`
- `apps/web/src/components/client-portal/client-shell.tsx`
- `apps/web/src/components/client-portal/client-sidebar.tsx`
- `apps/web/src/components/client-portal/client-task-detail.tsx`
- `apps/web/src/components/client-portal/client-task-list.tsx`
- `apps/web/src/components/client-portal/client-topbar.tsx`
- `apps/web/src/navigation/client-navigation.ts`
- `apps/web/test/sprint-4-baseline.test.mjs`
- `docs/sprint-4/sprint-4-implementation-summary.md`

## Files Modified

- `apps/api/prisma/schema.prisma`
- `apps/api/src/app.module.ts`
- `apps/api/src/modules/permissions/permission.service.ts`
- `apps/api/src/modules/permissions/permission.types.ts`
- `apps/api/test/sprint-3-baseline.test.mjs`

## Packages Installed

- None.

## Data Models Added Or Changed

- `Project` now includes `clientVisible` and `clientScopeKey` placeholders for future client-safe project access.
- `Task` now includes `clientVisible` and `clientScopeKey` placeholders for future client-safe task access.
- Tenant ownership remains preserved through existing `tenantId` fields.
- No SQL scripts or database migrations were created.

## Endpoints Added

- `GET /api/client/projects`
- `GET /api/client/projects/:id`
- `GET /api/client/tasks`
- `GET /api/client/tasks/:id`

## Frontend Pages Added

- `/client`
- `/client/projects`
- `/client/projects/[id]`
- `/client/tasks`
- `/client/tasks/[id]`

## Components Added

- `ClientShell`
- `ClientSidebar`
- `ClientTopbar`
- `ClientDashboard`
- `ClientProjectList`
- `ClientProjectDetail`
- `ClientTaskList`
- `ClientTaskDetail`
- `ClientSafeNotice`

## Tests Added

- API Sprint 4 boundary tests for client visibility fields, client routes, permission guard usage, client-safe return types, audit placeholders, route separation, and deferred module absence.
- Web Sprint 4 boundary tests for client routes, client portal components, separate client navigation, internal-only label exclusion, and deferred feature absence.
- Sprint 3 API baseline test updated to allow the Sprint 4 client portal module while still rejecting deferred modules.

## What Was Intentionally Not Implemented

- File uploads.
- Approvals.
- Client chat.
- CRM.
- Finance.
- AI.
- Reports.
- Automations.
- Advanced client portal features.
- Production client authentication integration.
- Production data-backed client project/task access beyond Sprint 4-safe placeholders.

## Remaining Sprint 4 Blockers

- None.

## Completion Status

- Sprint 4 is complete.

## Validation Results

- `apps/api npm run build`: Passed.
- `apps/api npm test`: Passed, 26 tests.
- `apps/api npm run prisma:validate`: Passed.
- `apps/web npm run build`: Passed.
- `apps/web npm test`: Passed, 15 tests.
