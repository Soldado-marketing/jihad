# MAOS-G10 — Bulk actions on tasks (move, assign, label, status)

**Closure status (2026-11-18): IN PROGRESS — checklist written before any code.**

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

The row names four actions: move, assign, label, status. Status is its own action, so **move = move to another project** (or to "No project"), which is what the single-task editor calls the project field. Moving between board columns is the status action.

## Acceptance checklist

| # | Requirement (from the task row unless marked) | How it is proven |
|---|---|---|
| 1 | Tasks can be selected in the list view: one by one, all shown at once, and cleared; the number selected is shown | browser spec; web unit tests of the selection helper |
| 2 | Bulk status: the chosen status is stored on every selected task | browser spec + API read-back |
| 3 | Bulk assign: every selected task gets the chosen member; the member is notified once per task | browser spec + API suite |
| 4 | Bulk move: 20 tasks moved to another project in one action are all stored there | browser spec with 20 tasks + API read-back |
| 5 | Bulk label: the chosen label is on every selected task afterwards | browser spec + API read-back |
| 6 | Audit per task: each of the 20 tasks has its own record of the change, with the person who did it | API suite (20 records per action); browser spec reads the records of the bulk move |
| 7 | Scope respected: a person limited to their own tasks cannot change a task they may not see, by any of the four actions, and nothing is recorded; another company's task is out of reach | API suite, including the label routes (gap above closed) |
| 8 | A bulk action asks before it changes anything, says how far it is, and says the result in plain words (derived: twenty changes at once need a question first) | browser spec |
| 9 | Partly failed: when some tasks could not be changed, the page says how many succeeded and how many did not, the failed ones stay selected, the others are stored (derived: single requests can fail one by one) | browser spec with one request failing; web unit tests of the summary |
| 10 | A task already in the chosen state is not changed and not recorded again (derived: no empty audit records) | web unit test of the plan; API suite for the label route (adding a label twice records once) |
| 11 | The selection never outlives what is shown: after a filter change, selected tasks that are no longer listed are not acted on (derived: nobody changes what they cannot see on the screen) | web unit test; browser spec |
| 12 | The list view and the bar fit a phone screen and work there (F08) | browser spec on both viewports; the phone-width sweep includes the list view with tasks selected |
| 13 | No schema change, no migration, no new task write route | diff |
| 14 | Single-task editing, the board and the existing suites are unchanged | existing suites green |
| 15 | Web unit tests, API tests, browser suite and CI six jobs green | CI |
| 16 | Merge and deployment on the owner's message; then the check on production | — |

## Not in this task

- Bulk delete, bulk priority, bulk due date (not in the task row).
- Selection on the board view (the row says list view).
- One request that changes many tasks at once (the row says: existing endpoints; and one failing task must not undo the others).
