# MAOS-G10 — Bulk actions on tasks (move, assign, label, status)

**Closure status (2026-11-19): DONE.** Built, tested, merged as #178 on the owner's message, main CI green, both services rebuilt and healthy, and checked on production in one session with G07 in a fictional company, with the owner's approval: twenty tasks selected, the four actions stored and recorded per task, the scope respected. The fictional data is removed and every count is back where it was. The checklist below was written before any code.

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
| 15 | CI six jobs green | PR head `71f5937`, run 44342370410: six jobs SUCCESS — isolation gate with both G10 groups ok, browser 148 passed / 6 skipped by design with the three `16-task-bulk-actions` cases on desktop and phone and the phone-width sweep. CI did not start when the PR was opened; closing and reopening started it, and the first of the two runs was cancelled by the workflow's concurrency rule | PASS |
| 16 | Merge and deployment on the owner's message | owner's message 2026-11-18 ("موافق على دمج #177 التوثيقي و#178 بعد التأكد إن فحوص آخر التزام بكل طلب خضراء"); six checks SUCCESS read on `71f5937` before the merge; merged with `--match-head-commit` → main `41cfcf1` (16:16:06Z). Main CI run 44345234697: six jobs SUCCESS, browser 148 passed / 6 skipped. Railway: `jihad` `d1c44f5d` and `maos-web` `f0031f65` SUCCESS on `41cfcf1`; `/api/health/ready` 200 (database up); the label route answers 401 without a session; API log: started, scheduler started, no error line. Rollback: API `4fa017ef`, web `498a9e46`. No database change | PASS |
| 17 | The bar is in what production serves | the script chunks of `/tasks` fetched from production (14 files): "Bulk actions", "Select all tasks shown" and "could not be changed" are present, and the comment thread of G07 is still there | PASS |
| 18 | The check on production: twenty tasks selected in the list, the four actions run, stored and recorded per task; an employee cannot change a task that is not theirs | run 2026-11-19 in a fictional company: 20 of 20 for each action with 20 records each, the employee refused on the task that is not theirs; data removed, baseline restored — see "The check on production" below | PASS |

## The check on production — run 2026-11-19, passed, data removed

Owner's approval of the test and the clean-up: 2026-11-18 ("موافق على إنشاء شركة اختبار وهمية معزولة على إنتاج MAOS لفحص G07 وG10، وحذف بيانات الاختبار فقط بعدها"). One session for G07 and G10 in one fictional company, `g0710-mwmc6z0uce55` (addresses `@g0710.fiktiv.test`): 1 customer, 3 projects, 1 label, 22 tasks, 3 invitations. The owner accepted the three invitations in the app's browser pane and signed in there; the session typed no password. Production ran main `41cfcf1` (`jihad` `d1c44f5d`, `maos-web` `f0031f65`).

### G10 — bulk actions (as the fictional Owner, in the list view)

| Action on the twenty tasks | The page | The database afterwards |
|---|---|---|
| Set status → Done | asked "Set 20 tasks to “Done”?", then "20 tasks changed." | 20 of 20 `DONE`; 20 `task.status.changed` records, one per task, by the Owner, SUCCESS |
| Move → the other project | asked, then "20 tasks changed." | 20 of 20 in the target project; 20 `task.updated` records, one per task |
| Add label | asked, then "20 tasks changed." | 20 of 20 carry the label; 20 `task.label.added` records, one per task |
| Assign → the employee | asked, then "20 tasks changed." | 20 of 20 assigned; 20 `task.assigned` records, one per task; 20 assignment notices to the employee |
| The same label again | "Nothing to change: all 20 tasks were already set." | still exactly 20 label records: nothing recorded twice |

The selection stayed on the twenty after each action; after a reload the twenty were still Done. At phone size (375 px) the list with the bar was not wider than the screen and the task names had room (225 px).

### G07 — comment thread and mention

| Step | Result |
|---|---|
| Owner opens the thread task: empty thread with its sentence, "Internal — clients never see these comments." | seen |
| Owner types `@emp`: the list offers the employee only — not the client, not the writer; Enter picks the name | seen; the server's list for that task: 2 people, the client not among them |
| Owner posts the comment | shown with the author, the time and the name marked as a mention; the box is empty again |
| **The notice reaches the employee** | the employee's bell: "You were mentioned in a task comment" with the task's name, on top; in the database one notice to the employee that names the task and does not carry the comment text |
| The notice opens the task | a click on it opens that task's editor on the board; the address is `/tasks` again |
| Employee sees the Owner's comment without any control, answers, changes the own comment | 2 comments in order after a reload; the employee's one marked "edited"; the Owner sees Edit and Delete on the own comment and Delete only on the employee's |
| At phone size | the editor with the thread is not wider than the screen |

### Permissions

| Who | Tried | Answer |
|---|---|---|
| Employee, before anything was assigned | the task list | 0 of 22 tasks |
| Employee, after the assignment | the task list | 21 tasks; the task that is not theirs is not listed |
| Employee | read, change status, add label on the task that is not theirs; read its comments; the mention list for it | 404 each; that task unchanged, no label, no audit record |
| Employee | change and delete the Owner's comment | 403 each; the comment unchanged |
| Employee | the company's member list | 403 |
| Client | the comments of the task, all notes, the mention list, the task itself | 403 each |
| Client | the portal: projects, progress, deliveries, appointments, invoices, notices | 200; the client's project is there; no comment text in any answer; 0 notices |
| Client | the workspace task page | sent back to the portal |
| Owner | a comment that mentions the client | 400 `MENTION_NOT_ALLOWED`; nothing stored (2 comments before and after) |

### Clean-up

Before the seed and after the clean-up, the same counts: companies 1, users 4, memberships 4, customers 0, projects 2, tasks 0, labels 1, task labels 0, notes 0, notices 0, invitations 3, invoices 1, files 2, file versions 0, approvals 1. Removed: the one company with everything in it, the 3 fictional users, 3 invitations, 107 audit records and 4 sign-in records of the fictional company and addresses (one of them the refused sign-in before the first invitation was accepted). Leftovers in 18 tables: 0. A second clean-up found nothing to remove. The three fictional sessions are refused afterwards (401 on a request and on a renewal), and their tokens were removed from the pane. The used invitation links were deleted.

### Seen during the check, not changed

1. **The list of people to assign to offers the client.** The member list the Owner gets contains every active member, so "Assign to" in the bar — and the same list in the task editor and the new-task form — names the client too, and the API accepts any active member as assignee. Not tried on production. Proposed as its own task: leave clients out of assignee lists and refuse a CLIENT as assignee.
2. **A bulk assignment sends one notice per task**: the employee's bell showed 22 unread after 21 assignments and one mention. That is what "once per task" means today; a single summary notice would be a product decision.
3. The three fictional accounts carried their address as name, which is what was entered when the invitations were accepted (the code stores the name as typed); mentions and lists therefore showed addresses in this check.

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
