# D08 — acceptance checklist and evidence matrix

**Task (master task list, row D08):** Client-facing status visibility for projects and tasks. Deps: —. Notes: client project page shows task progress by status with client-safe wording; no internal notes or assignees. Acceptance: client sees counts and statuses only; isolation tests.

**Closure status (2026-11-13): IN PROGRESS.** Written before implementation (owner's rules of 2026-11-04: checklist from the original specification first, independent comparison before closure, functional tests, never page-load checks). Status values: PASS (test or measurement named) · OPEN · BLOCKED — OWNER.

**Independence from D07:** D07 is deployed and its production reading of the History tab is pending (no customer on production; owner's instruction of 2026-11-13: no test customer, not DONE). D08 has no dependency in the plan and touches the client portal only (`client-portal` module, My Work page); it reads no D07 code. Started on the owner's instruction of 2026-11-13.

## Blueprint check (§30)

- §2 roles: a CLIENT is read-only, only on routes declared `client-portal`, data filtered to the membership's `clientScopeKey`; never internal notes. D08 adds one read-only `client-portal` route with that filter. No conflict.
- §5/§6 invariants: client scope comes from the database membership only (`ClientScopeService.resolve`), never from the request. Kept: the new read uses the same resolver and the same two gates (row is client-visible, row is in the caller's scope).
- §12 Tasks: one task system. D08 adds no model and no second list; it counts existing rows.
- §29 migration rule: no schema change, no migration.
- Result: **no BLUEPRINT_CONFLICT.**

## Audit before coding

- `GET /api/client/projects` and `/projects/:id` return id, name, status (and description); `/api/client/tasks` returns id, title, status, projectId of client-visible tasks. No route gives a per-project progress.
- Web: `/client/projects`, `/client/projects/[id]`, `/client/tasks`, `/client/tasks/[id]` redirect to My Work (`/client/deliveries`) since Client Portal V2 (owner decision 2026-11-02: tasks are internal working items; clients review deliveries). My Work lists deliveries by status with a project filter; **a client sees no progress of a project today.**
- A static web test (`client-deliveries.test.mjs`, "shows no task counters") keeps the client dashboard summary free of task numbers.

## Design decision (stated, reversible)

The row asks for task progress by status on the client's project view; the 2026-11-02 decision removed the task views from the portal. Both are kept as follows:

- No task is listed and none can be opened: the client receives **numbers per stage only** — no id, title, description, assignee, date, priority or note of any task.
- Only tasks the company marked as shared with the client (`clientVisible`) inside the client's own scope are counted; an unshared task changes nothing the client sees. Appointments (they have their own page) and archived tasks are not counted.
- Stages in client wording: Planned (`TODO`), In progress (`IN_PROGRESS` and `BLOCKED` — an internal blockage is not exposed as such), In review (`IN_REVIEW`), Done (`DONE`). The word "task" is not used towards the client ("work steps").
- Place: the project filter of My Work is the client's project view, so the progress is shown there, per project; the dashboard summary stays untouched.
- Whether clients should see these numbers at all is confirmed with the owner at the release decision (one route, one panel; removable without touching anything else).

## Matrix

| # | Criterion (from the row) | Test | In CI | Status |
|---|---|---|---|---|
| 1 | A client sees, per own shared project, its state and the number of shared work steps per stage (Planned, In progress, In review, Done) | API integration `client-progress-api` | yes | OPEN |
| 2 | Counts only: no task id, title, description, assignee, date, priority, note or label in the answer (payload key scan) | same suite | yes | OPEN |
| 3 | Client-safe wording: `BLOCKED` is counted as In progress and never leaves the server as its own number; archived tasks and appointments are not counted | unit `client-progress` + same suite | yes | OPEN |
| 4 | Only shared rows: a task that is not client-visible is not counted; a project that is not client-visible is absent | same suite | yes | OPEN |
| 5 | Isolation: client A never receives client B's project or numbers; another company's rows never appear; a client without a scope is refused (403, fail closed) | same suite + `security-gate-client-isolation` (new route added to its lists) | yes | OPEN |
| 6 | Roles: anonymous 401; EMPLOYEE and CONTRACTOR refused (403) as on every portal route; OWNER and MANAGER preview is not narrowed | same suites | yes | OPEN |
| 7 | A client whose task access was withdrawn receives the projects without numbers | same suite | yes | OPEN |
| 8 | Read only: no write path, no schema change, no migration | branch diff | — | OPEN |
| 9 | Web: My Work shows a "Project status" panel — state, progress bar with an accessible value, four stage numbers; empty state when nothing is shared; the delivery list still works when the panel cannot load | web unit `client-progress` + browser spec | yes | OPEN |
| 10 | Web: the project filter narrows the panel to the chosen project; a project without deliveries can be chosen | browser spec | yes | OPEN |
| 11 | Web on a phone-width screen: no sideways scrolling | browser spec (mobile project) | yes | OPEN |
| 12 | No task can be opened or listed from the panel; the words "task", "assignee", "internal" do not appear in it | web unit (source scan) + browser spec | yes | OPEN |
| 13 | Regression: `security-gate-client-isolation`, `client-deliveries`, `client-portal-v2` web tests, portal browser specs, full API `npm test`, web tests | local runs | yes | OPEN |
| 14 | CI: six jobs green on the code head | CI run | yes | OPEN |
| 15 | Graphify refreshed; dependents of changed symbols reviewed | `graphify update .` | — | OPEN |
| 16 | Security review of the diff: company filter and client scope on every query; nothing but numbers about tasks | review | — | OPEN |
| 17 | Merge, deploy (API and web, no migration) and production verification when authorised; a verified backup of the same day first | release record | — | BLOCKED — OWNER |
