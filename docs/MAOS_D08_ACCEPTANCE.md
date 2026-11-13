# D08 — acceptance checklist and evidence matrix

**Task (master task list, row D08):** Client-facing status visibility for projects and tasks. Deps: —. Notes: client project page shows task progress by status with client-safe wording; no internal notes or assignees. Acceptance: client sees counts and statuses only; isolation tests.

**Closure status (2026-11-13): implementation and local verification complete; CI on the pull request and the release decision are open — not DONE.** Written before implementation (owner's rules of 2026-11-04: checklist from the original specification first, independent comparison before closure, functional tests, never page-load checks). Status values: PASS (test or measurement named) · OPEN · BLOCKED — OWNER.

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
| 1 | A client sees, per own shared project, its state and the number of shared work steps per stage (Planned, In progress, In review, Done) | API integration `client-progress-api` | yes | PASS — `client-progress-api` cases 1–2: client A receives its two shared projects; project one `{ total 8, planned 2, inProgress 2, inReview 1, done 3 }`; a shared project without shared work has zeros and its own state (`PAUSED`) |
| 2 | Counts only: no task id, title, description, assignee, date, priority, note or label in the answer (payload key scan) | same suite | yes | PASS — `client-progress-api` case 3: keys are exactly `id, name, status, steps` and `total, planned, inProgress, inReview, done`; the answer contains no task title, description, assignee id, `dueAt`, `priority`, `title`, `description`, `clientScopeKey` |
| 3 | Client-safe wording: `BLOCKED` is counted as In progress and never leaves the server as its own number; archived tasks and appointments are not counted | unit `client-progress` + same suite | yes | PASS — unit `client-progress` 6/6 (`BLOCKED` → in progress; archived and unknown statuses not counted); `client-progress-api` cases 1 and 3 (a blocked, an archived and an appointment task in the data; the strings `BLOCKED`, `ARCHIVED`, `Shooting appointment` are not in the answer) |
| 4 | Only shared rows: a task that is not client-visible is not counted; a project that is not client-visible is absent | same suite | yes | PASS — `client-progress-api` cases 1 and 4: an unshared task, a task without a project and a hidden project's shared task are not counted; the hidden project is absent |
| 5 | Isolation: client A never receives client B's project or numbers; another company's rows never appear; a client without a scope is refused (403, fail closed) | same suite + `security-gate-client-isolation` (new route added to its lists) | yes | PASS — `client-progress-api` cases 5–7 (client B gets only its own project; another company with the same scope key gets only its own rows; no scope → 403 `client_scope_missing`, no row); `security-gate-client-isolation` 53/53 with `/api/client/progress` in its three lists (A/B, no scope, work-scoped roles) |
| 6 | Roles: anonymous 401; EMPLOYEE and CONTRACTOR refused (403) as on every portal route; OWNER and MANAGER preview is not narrowed | same suites | yes | PASS — `client-progress-api` cases 9–10: anonymous 401; EMPLOYEE and CONTRACTOR 403 with no row; OWNER and MANAGER see every shared project of their company and none of the other company |
| 7 | A client whose task access was withdrawn receives the projects without numbers | same suite | yes | PASS — `client-progress-api` case 8: a CLIENT with a withdrawn task grant receives both projects with `steps: null` |
| 8 | Read only: no write path, no schema change, no migration | branch diff | — | PASS — branch diff: no file under `apps/api/prisma`; the service has two `findMany`/`groupBy` reads and one permission decision, no write; `client-progress-api` case 11: POST, PATCH and DELETE on the route are 404 and the task count is unchanged |
| 9 | Web: My Work shows a "Project status" panel — state, progress bar with an accessible value, four stage numbers; empty state when nothing is shared; the delivery list still works when the panel cannot load | web unit `client-progress` + browser spec | yes | PASS — web unit `client-progress` 13/13 (wording, arithmetic, bar attributes, failure line); browser spec `11-client-project-status` case 1 at both widths: state, "1 of 5 work steps done", bar value 20 with an accessible name, the four numbers `1, 2, 1, 1`, deliveries still listed |
| 10 | Web: the project filter narrows the panel to the chosen project; a project without deliveries can be chosen | browser spec | yes | PASS — browser spec case 2 at both widths: every shared project listed; a project without a delivery is chosen in the filter and the panel shows that project only |
| 11 | Web on a phone-width screen: no sideways scrolling | browser spec (mobile project) | yes | PASS — browser spec case 1 in the mobile project: page overflow ≤ 1 px; screenshots at 1280 px and 390 px reviewed (first layout pushed the deliveries far down — the four numbers were made one compact line) |
| 12 | No task can be opened or listed from the panel; the words "task", "assignee", "internal" do not appear in it | web unit (source scan) + browser spec | yes | PASS — web unit (source scan of the panel and its rules: no link, button or handler; no "task", "assignee", "internal", "blocked"); browser spec case 1: no step title in the panel, no link and no button inside it |
| 13 | Regression: `security-gate-client-isolation`, `client-deliveries`, `client-portal-v2` web tests, portal browser specs, full API `npm test`, web tests | local runs | yes | PASS — full API `npm test` 626 tests: 616 pass, 0 fail, 10 todo (one static baseline, `sprint-4-baseline`, counted four portal routes: updated to five with the new route named); `integration-api` 39/39 alone on a fresh database; portal suites 88/88; web tests 403/403; whole browser suite on the isolated stack 104/104 (one existing client test looked at the first text match, which became the filter's `<option>` once a client has several shared projects: it now looks at shown text) |
| 14 | CI: six jobs green on the code head | CI run | yes | OPEN |
| 15 | Graphify refreshed; dependents of changed symbols reviewed | `graphify update .` | — | PASS — `graphify update .`; `ClientProgressService` is referenced by `client-portal.controller.ts` and `client-portal.module.ts` only; `SHOOTING_LABEL` is imported, not changed |
| 16 | Security review of the diff: company filter and client scope on every query; nothing but numbers about tasks | review | — | PASS — both queries carry the company id; a CLIENT's queries carry the membership's scope key on projects and on tasks, resolved by `ClientScopeService` (never from the request); tasks are restricted to the caller's visible projects; the answer is built from counts only. Mutation check on the built service: without the task scope filter 1 case fails, without the appointment exclusion 2, without the project visibility filter 4 |
| 17 | Merge, deploy (API and web, no migration) and production verification when authorised; a verified backup of the same day first | release record | — | BLOCKED — OWNER |

## Run record

| Where | Result |
|---|---|
| Before the change (main `ff7611a`) | the client portal showed no progress of a project; no route returned numbers per stage |
| API unit | `client-progress` 6/6 |
| API integration (disposable PostgreSQL 16) | `client-progress-api` 12/12 on the first run; three guards removed one at a time in the built service made 1, 2 and 4 cases fail; restored 12/12 |
| Isolation gate | `security-gate-client-isolation` 53/53 (5 new cases through the route's entries in its lists) |
| Web unit | `client-progress` 13/13; whole web suite 403/403 |
| Browser, local isolated stack (private ports, disposable database, storage stub) | new spec 8/8 (4 cases × desktop and phone width); whole suite 104/104 in 55 s. Earlier runs of the day: a locator of the new spec matched two elements (fixed in the spec); the existing client test described in row 13; the C06 upload-cancel case at phone width failed once more in a whole-suite run and passed in the two runs after it (open finding, not from this change) |
| Visual check | screenshots at both widths reviewed; cards made compact so the deliveries stay near the top |
| Local regression | row 13 |

## Notes for the release (row 17)

- API and web both change; no migration. Rollback: redeploy API `61b395d6` and web `9bb3a7d6`, or revert the merge commit.
- Decision for the owner with the release: clients would see, per shared project, how many shared work steps are planned, in progress, in review and done. The client task views were removed on 2026-11-02; this brings back numbers only, never a list. If the numbers are not wanted, the panel and the route can be left unmerged without affecting anything else.
- The numbers count only tasks the company marked as shared with the client. A company that shares no task shows "No work steps have been shared yet." for a shared project.
- Production verification needs a CLIENT sign-in with a shared project; production has no customer today (see D07), so this check will be pending in the same way.
