# MAOS-G10 — Bulk actions on tasks (move, assign, label, status)

**Closure status (2026-11-18): IN PROGRESS — built and tested locally; CI, the owner's merge decision and the production check are open. Not DONE.** The checklist below was written before any code.

Task row: "Bulk actions on tasks (move, assign, label, status). Multi-select on list view; uses existing reorder/update endpoints; audit per task. Acceptance: bulk move of 20 tasks persists and audits; scope respected."

## Blueprint check (§30)

No conflict.

- §12 one task system: the actions change the canonical `Task` through the routes that exist; no second task engine, no bulk table.
- §5 no duplicate systems, §29 no migration: no model, no column, no new write route for tasks. A bulk action is the same single-task request, once per selected task, so every rule and every audit record of a single change applies unchanged.
- §2.1 permissions as they are: whoever may update a task today may select it; nobody gains a right through the list.
- §6 isolation: what a person may not see they cannot select, and a request for it is refused by the API as it is for a single change.

## What exists (audit on main `1b20472`)

| Piece | State |
|---|---|
| `PATCH /api/tasks/:id` (status, assignee, project, …) | checks the caller's task scope; records `task.status.changed`, `task.assigned`, `task.updated` per task; notifies a new assignee once |
| `POST` / `DELETE /api/tasks/:taskId/labels/:labelId` | checks the company only — **gap:** not the caller's task scope (an employee limited to their own tasks can label any task of the company), and **no audit record** |
| `PATCH /api/tasks/reorder` | order inside a column and board lists; not needed for these four actions |
| List view (`/tasks?view=list`) | rows open the editor; no selection |
| Rate limit | 600 requests a minute per client: twenty or a few hundred single requests fit |

## What "move" means here

The row names four actions: move, assign, label, status. Status is its own action, so **move = move to another project**, which is what the single-task editor calls the project field. Like the editor, the bar offers projects and members only: it cannot take a task out of every project or leave it without an assignee. Moving between board columns is the status action.

## Acceptance checklist and evidence

| # | Requirement (from the task row unless marked) | Evidence | Result |
|---|---|---|---|
| 1 | Tasks can be selected in the list view: one by one, all shown at once, and cleared; the number selected is shown | `e2e/16-task-bulk-actions.spec.ts` cases 1 and 2 on desktop and phone ("1 selected", "20 selected", "Clear selection"); `test/bulk-tasks.test.mjs` selection group | PASS locally |
| 2 | Bulk status: stored on every selected task | browser case 1: twenty tasks set to Done, read back through the API: 20 × `DONE` | PASS locally |
| 3 | Bulk assign: every selected task gets the member; the member is told once per task | browser case 1: 20 × the employee's id; API suite: 20 notices, one per task | PASS locally |
| 4 | Bulk move: 20 tasks moved to another project in one action are all stored there | browser case 1: 20 × the target project, still there after a reload; API suite "move" | PASS locally |
| 5 | Bulk label: the label is on every selected task afterwards | browser case 1: 20 of 20 carry it; API suite: 20 rows | PASS locally |
| 6 | Audit per task: each of the 20 tasks has its own record, with the person who did it | API suite: for status, assign, move and label exactly 20 records each, one per task, actor = the person, outcome SUCCESS; browser case 1 reads each task's history after the status change and the move: one `task.status.changed` and one `task.updated` per task | PASS locally |
| 7 | Scope respected, by all four actions; another company out of reach | API suite: an employee limited to their own tasks and a contractor get 404 for status, assignee, project and both label routes on a task they may not see, nothing stored, nothing recorded; another company's task, label and project refused in both directions; browser case 3 for the employee | PASS locally |
| 8 | Asks first, says how far it is, says the result | browser case 1: the question is shown and the twenty tasks are unchanged until "Apply"; "Cancel" changes nothing; "20 tasks changed." afterwards; unit test: choosing sends nothing | PASS locally |
| 9 | Partly failed: counts, the failed ones stay selected, the others are stored | browser case 2: one of twenty requests fails → "19 of 20 tasks changed. 1 could not be changed and is still selected.", that task is the one still ticked, 19 stored, the retry for the one works | PASS locally |
| 10 | A task already in the chosen state is not changed and not recorded again | unit test of the plan (no request for it); browser case 1: the same label again → "Nothing to change: all 20 tasks were already set."; API suite: same label, status and assignee again → no new record, no second notice | PASS locally |
| 11 | The selection never outlives what is shown | browser case 2: twenty selected, the search narrows the list to ten → "10 selected", and it stays ten when the list is wide again; leaving the list view clears it; unit test | PASS locally |
| 12 | The list view and the bar fit a phone screen and work there | browser cases on the phone project; the page with the bar measured: not wider than the screen; the phone-width sweep now includes `/tasks?view=list`; screenshots at both sizes looked at | PASS locally |
| 13 | No schema change, no migration, no new task write route | diff: `apps/api/prisma/` untouched; the bar calls `PATCH /tasks/:id` and `POST /tasks/:id/labels/:labelId` only (unit test) | PASS |
| 14 | Single-task editing, the board and the existing suites are unchanged | whole browser suite locally 148 passed, 6 skipped by design; API unit 616 pass / 10 todo / 0 fail; eleven related integration suites green; web unit 452/452 | PASS locally |
| 14a | The tests catch what they claim | three temporary changes to the label service: scope ignored → 2 cases fail; change not recorded → 2; repeat recorded again → 1. Code restored, 10/10 | PASS |
| 15 | CI six jobs green | on the PR | OPEN |
| 16 | Merge and deployment on the owner's message; then the check on production | — | OPEN — owner |

## What was built

- **Web**: checkboxes in the list view (one per task and one for everything shown), a bar above the list while tasks are selected — status, assignee, project, label — with a question before anything changes, a count while it runs and a sentence afterwards. `lib/bulk-tasks.ts` holds the selection, the plan of single requests and the sentences. After a full success the selection stays, so a second action can follow; after a partial one only the failed tasks stay selected.
- **API (`modules/labels`)**: putting a label on a task and taking it off now follow the caller's task scope like every other change to a task, and each real change is recorded on the task (`task.label.added`, `task.label.removed`). Nothing else changed in the API; there is no bulk route.

## Found on the way

| Finding | What was done |
|---|---|
| The label routes checked the company only: an employee limited to their own tasks, or a contractor, could put a label on any task of the company, and no label change was recorded | closed and tested (rows 6, 7, 14a) |
| On a phone the task list showed no task names at all: five fixed-width columns left the title no room (seen on the first phone screenshot) — tasks could not be told apart, let alone selected | below the wide layout a row is now the title with one line of details (priority, assignee, due date) and the status; the full columns are unchanged at 1280 px and wider. The spec checks that the title has room |
| The existing guard test for tenant-aware data access refused a lookup by the pair of ids without the company | the lookup carries the company |

## Findings for the owner (not changed here)

1. **Between 1024 and 1279 px the task list now uses the compact rows** as on a phone. Before, the title had about 50 px there. If the full columns are wanted earlier, the column widths have to be rethought.
2. **Only the Owner gets a list of members**, so only the Owner sees "Assign to" in the bar — as in the task editor today. Managers cannot assign in bulk (or pick an assignee in the editor) until the member list is opened to them: a permission decision.
3. **The bar cannot unassign or take tasks out of every project**, like the editor.
4. Bulk delete, priority and due date are not part of this task.

## Not in this task

- Bulk delete, bulk priority, bulk due date (not in the task row).
- Selection on the board view (the row says list view).
- One request that changes many tasks at once (the row says: existing endpoints; and one failing task must not undo the others).
