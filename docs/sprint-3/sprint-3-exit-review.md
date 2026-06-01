# Sprint 3 Exit Review

## Sprint 3 Result

Status: Pass.

Sprint 3 Projects, Tasks, and Subtasks Core is complete for the approved baseline scope.

Validated coverage:

- Project model exists.
- ProjectMember assignment baseline exists.
- Task model exists.
- Subtask model exists.
- ProjectStatus exists.
- TaskStatus exists.
- TaskPriority exists.
- Tenant-owned Sprint 3 models include `tenantId`.
- Backend modules, routes, services, repositories, DTOs, permission guards, and audit placeholders exist.
- Frontend pages and components for projects, tasks, and subtasks exist.
- Sprint 3 tests exist for API and web coverage.

## Backend Result

Status: Pass.

Validated backend data model coverage:

- `Project`
- `ProjectMember`
- `Task`
- `Subtask`
- `ProjectStatus`
- `TaskStatus`
- `TaskPriority`

Validated backend module coverage:

- `ProjectsModule`
- `TasksModule`
- `SubtasksModule`
- DTOs for create/update operations.
- Controllers for REST-first routes.
- Services for scope validation and audit placeholder orchestration.
- Tenant-aware repositories.
- Modules registered in `AppModule`.

Validated endpoint coverage:

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

## Frontend Result

Status: Pass.

Validated frontend page coverage:

- `/projects`
- `/projects/[id]`
- `/tasks`
- `/tasks/[id]`

Validated component coverage:

- `ProjectList`
- `ProjectDetail`
- `TaskList`
- `TaskDetail`
- `SubtaskList`
- `StatusBadge`

Empty, loading, denied, and unauthorized state components remain available from Sprint 2.

## Security And Tenant Result

Status: Pass for Sprint 3 baseline.

Validated controls:

- Tenant-owned Sprint 3 models include `tenantId`.
- Sprint 3 repositories extend the tenant-aware repository baseline.
- Sprint 3 repositories call `requireTenantContext`.
- Sprint 3 controllers use `PermissionGuard`.
- Sprint 3 routes use `RequirePermission`.
- Sprint 3 services call service-level scope validation placeholders.
- Client role does not receive Projects or Tasks navigation.
- UI permission helpers remain frontend-only.
- Backend permission guard remains the source of truth.

Known limitation:

- Persistent project/task reads and writes are intentionally placeholder-based until a controlled database migration and persistence workflow is approved.

## Audit Result

Status: Pass.

Validated audit placeholders:

- `project.created`
- `project.updated`
- `task.created`
- `task.updated`
- `subtask.created`
- `subtask.updated`

Sprint 1 audit service and redaction baseline remain intact. No sensitive audit regression was identified.

## Test Result

Status: Pass.

| Command | Result |
|---|---|
| `npm run build` from `apps/api` | Passed |
| `npm test` from `apps/api` | Passed, 19 tests |
| `npm run prisma:validate` from `apps/api` | Passed |
| `npm run build` from `apps/web` | Passed |
| `npm test` from `apps/web` | Passed, 10 tests |

Sprint 3 tests cover:

- Data model existence.
- `tenantId` on tenant-owned project/task/subtask models.
- REST route skeletons.
- Permission guard usage.
- Permission resource expansion.
- Tenant-aware repository enforcement.
- Audit placeholders.
- Scope boundaries.
- Frontend project/task pages.
- Frontend project/task/subtask components.
- Client portal route absence.
- Navigation role boundaries.

## Scope Review Result

Status: Pass.

Confirmed not implemented:

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
- Templates.
- Skill matching.
- SQL scripts.
- Prisma migrations.

## Sprint 2 Test Update Review

Status: Pass.

The Sprint 2 test update is valid and not a weak bypass.

Rationale:

- Sprint 2 originally checked that projects/tasks were absent because they were not yet in scope.
- Sprint 3 intentionally adds projects/tasks.
- The Sprint 2 test now continues to block deferred modules such as CRM, finance, automations, and reports.
- Sprint 3 tests explicitly cover project/task models, routes, components, navigation, permission placeholders, audit placeholders, and scope boundaries.

## Remaining Blockers

None for Sprint 3 exit or Sprint 4 start.

Non-blocking follow-ups:

- Replace placeholder project/task repositories with controlled persistent data access once the migration workflow is approved.
- Expand Manager and Employee scope checks when assignment rules are implemented.
- Add client-safe project/task views only during the approved Client Portal sprint.

## Go/No-Go Decision For Sprint 4

Decision: Go.

Sprint 4 may start because Sprint 3 project/task/subtask foundations are present, tenant-scoped, permission-guarded, audit-ready at placeholder level, and validated.

## Required Fixes

None.

## Final Recommendation

Proceed to Sprint 4: Client Portal Foundation.

Sprint 4 must continue to respect these gates:

- Client portal routes must be separated from internal workspace routes.
- Client users must see only own-client and client-visible data.
- Client portal must not expose internal notes, internal chat, audit logs, employee costs, payroll, finance internals, AI/admin logs, reports, or unapproved files.
- Backend permission checks remain authoritative.
