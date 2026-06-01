# Sprint 4 Exit Review

## Sprint 4 Result

Sprint 4 is complete. The implementation delivers the Client Portal Foundation without adding deferred Sprint 5 or later functionality.

## Backend Result

PASS.

- `ClientPortalModule` exists and is registered in the API application module.
- Client portal endpoint skeletons exist:
  - `GET /api/client/projects`
  - `GET /api/client/projects/:id`
  - `GET /api/client/tasks`
  - `GET /api/client/tasks/:id`
- Client routes use `PermissionGuard` and `RequirePermission` with `scope: 'client-portal'`.
- Client own-scope validation placeholder exists through client actor validation, tenant ownership validation, `clientVisible`, and `clientScopeKey`.
- Client routes are separate from internal project and task controllers.

## Data Boundary Result

PASS.

- `Project` includes `clientVisible` and `clientScopeKey`.
- `Task` includes `clientVisible` and `clientScopeKey`.
- Client-safe response types expose only approved placeholder fields.
- No internal notes, internal chat, employee costs, payroll, audit logs, finance data, or other-client data are exposed through the Sprint 4 client portal service.
- Production data-backed client access remains intentionally deferred beyond the Sprint 4 boundary baseline.

## Audit Result

PASS.

- Audit placeholders exist for:
  - `client.portal.accessed`
  - `client.project.viewed`
  - `client.task.viewed`
- Audit payloads are client-safe placeholders and do not return audit event data to client responses.
- Sprint 1 audit service and audit redaction baseline remain intact.
- No sensitive payload regression was found.

## Frontend Result

PASS.

- Client portal routes exist:
  - `/client`
  - `/client/projects`
  - `/client/projects/[id]`
  - `/client/tasks`
  - `/client/tasks/[id]`
- Client portal components exist:
  - `ClientShell`
  - `ClientSidebar`
  - `ClientTopbar`
  - `ClientDashboard`
  - `ClientProjectList`
  - `ClientProjectDetail`
  - `ClientTaskList`
  - `ClientTaskDetail`
  - `ClientSafeNotice`

## Navigation/UI Boundary Result

PASS.

- Client navigation is separated in `client-navigation.ts`.
- Internal Owner, Manager, and Employee navigation does not link into the client portal.
- Client portal UI does not expose admin/settings/internal workspace links.
- Denied, unauthorized, empty, and loading state components remain available from the Sprint 2 shell foundation; empty states are used in client project and task lists.
- Client portal source does not show CRM, finance, AI, reports, audit, payroll, automations, internal notes, internal chat, files, or approvals.

## Test Result

PASS.

- `apps/api npm run build`: Passed.
- `apps/api npm test`: Passed, 26 tests.
- `apps/api npm run prisma:validate`: Passed.
- `apps/web npm run build`: Passed.
- `apps/web npm test`: Passed, 15 tests.

## Scope Review Result

PASS.

Confirmed not implemented:

- File uploads.
- Approvals.
- Client chat.
- CRM.
- Finance.
- AI.
- Reports.
- Automations.
- Advanced client portal features.
- Production data-backed client access beyond the Sprint 4 baseline.

## Sprint 3 Test Update Review

PASS.

The Sprint 3 API test update is valid. It allows the Sprint 4 `ClientPortalModule` while continuing to reject deferred modules such as CRM, finance, AI, reports, and automations. This is not a weak bypass because Sprint 4 has its own dedicated API boundary tests for the client portal module.

## Remaining Blockers

None.

## Go/No-Go Decision For Sprint 5

Go.

## Required Fixes

None.

## Final Recommendation

Proceed to Sprint 5: CRM Basic + Collaboration Foundation. Maintain the Sprint 4 boundary by keeping client portal access client-safe and avoiding file uploads, approvals, chat, finance, AI, reports, and automations until their approved sprint scope.
