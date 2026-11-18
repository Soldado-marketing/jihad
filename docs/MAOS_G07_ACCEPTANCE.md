# MAOS-G07 — Task comments thread with @mentions and notifications

**Closure status (2026-11-18): DEPLOYED — the check on production is PENDING; not DONE.** Built, tested, merged as #176 on the owner's message, main CI green, both services rebuilt and healthy, the thread is in what production serves. Open: nobody has yet written a comment with a mention on production and seen the notice arrive — that takes two signed-in members of staff, and the session types no password on production. The checklist below was written before any code.

Task row: "Task comments thread with @mentions and notifications. Reuse `InternalNote` per task + `Notification` for mentions (no schema); UI thread in task modal; CLIENT never sees internal comments. Acceptance: mention notifies the member; thread persists; isolation test."

## Blueprint check (§30)

No conflict.

- §5.2 no duplicate systems: the thread is the existing `InternalNote` with `resourceType = 'task'`; the notice is the existing `Notification` written by its one writer (`NotificationsService.notify`). No new model, no new column, no migration.
- §6.5 a CLIENT never receives internal notes: unchanged and tested here.
- §2.1 permissions as they are: OWNER, MANAGER and EMPLOYEE hold `INTERNAL_NOTE`; CONTRACTOR and CLIENT do not. This task changes no role and no grant. A contractor therefore does not take part in task comments — recorded as a finding for the owner, not decided here.
- §12 one task system: the thread hangs on the canonical `Task`; nothing task-like is added.

## What exists (audit on main `04a4b82`)

| Piece | State |
|---|---|
| `GET/POST/PATCH/DELETE /api/collaboration/notes` | exists; checks the `INTERNAL_NOTE` permission and the company, nothing else |
| Notes on a task | stored as `InternalNote` (`resourceType` `task`); the task editor has an optional block "Internal Notes", hidden until someone adds it, newest first, add only |
| Who may read a task's notes | **gap:** anyone with the permission, also an EMPLOYEE who may not see the task (employees are limited to their own tasks since 2026-10-31); the list without a filter returns every note of the company |
| Who may change a note | **gap for a thread:** anyone with the permission edits or deletes anyone's note |
| Mentions | none anywhere |
| Notification writer | exists (`notify`, audience filter, one row per event and recipient); the bell links a task notice to `/tasks` |

## Acceptance checklist and evidence

| # | Requirement (from the task row unless marked) | Evidence | Result |
|---|---|---|---|
| 1 | A task has one comment thread in the task editor: oldest first, author and time on each comment, visible without adding a block | `e2e/15-task-comments.spec.ts` case 1, desktop and phone: the section "Comments" is there on opening, the comments read top down with the author's name | PASS locally |
| 2 | The thread persists: after a reload the comments are there, in order | same case: reload, reopen, two comments in the same order; `security-gate-task-comments` reads the rows back from the database on the task | PASS locally |
| 2a | A deleted task takes its comments with it and nothing else (derived: the comments point at the task by id and nothing cleaned them up) | `security-gate-task-comments` "a deleted task takes its comments with it"; `storage-delete-inventory`, `task-lists`, `activity-timeline` unchanged and green | PASS locally |
| 3 | A comment can mention members with `@`: typing `@` offers the people who may read this task's comments; the chosen name stays marked after a reload | browser case 1: the list offers the employee, not the client and not the writer; the chosen name is in the text and marked after the reload; `test/mentions.test.mjs` 13 cases on the string work | PASS locally |
| 4 | A mention notifies the member: one notice in their bell, naming the task, never carrying the comment's text; the author is not notified | API suite: one `Notification` row, body = task title, comment text absent, in the member's `/notifications`, none for the author; browser case 1 and 2: the notice is in the employee's bell | PASS locally |
| 5 | Once per comment and person; a person added later is notified then | API suite: second save → still one; manager added by an edit → one for the manager; self-mention → none | PASS locally |
| 6 | The notice leads to the task (derived) | browser case 2: the bell's notice opens that task's editor on the board and the address is clean afterwards; unit test of the link (`/tasks?open=<id>`; nothing in the client portal) | PASS locally |
| 7 | Only people who may read the thread can be mentioned | API suite, five cases (CLIENT, CONTRACTOR on their own task, employee who may not see the task, member of another company, unknown id): 400, nothing stored, nobody notified — also not the allowed person in the same comment; the same on an edit; more than 20 refused; the name in a token is replaced by the member's real name | PASS locally |
| 8 | CLIENT never sees internal comments | API suite: every notes route 403 for a CLIENT; six client-portal and notification answers checked for a marker sentence; browser case 3: three routes 403 with a client's session | PASS locally |
| 9 | Isolation between companies | API suite: another company's task → 400 on write (as before), 404 on read; its comment → 404 on read, change, delete; not in the list; a mention across the border refused | PASS locally |
| 10 | Isolation inside the company: an employee who may not see a task reaches none of its comments, also not through the general list | API suite: 404 on list, mentionable, read, write, change, delete; the general list leaves those comments out and keeps general notes; the assignee sees only their own task's comments; the OWNER sees all | PASS locally |
| 11 | Only the author changes a comment; the author, an OWNER or a MANAGER removes it | API suite (OWNER and MANAGER get 403 on someone else's text; employee 403 on someone else's delete; MANAGER and author 204); browser cases 2 and 3: no control on someone else's comment for an employee, Delete without Edit for a manager | PASS locally |
| 12 | Loading, empty and failed states; the editor still fits a phone screen | browser case 1: empty sentence; case 3: a failed load says so with "Try again" and never the empty sentence; a refused reader gets no Comments section; case 1 measures the page with one long unbroken word in the thread: not wider than the screen | PASS locally |
| 13 | No schema change, no migration, no new notification writer | diff: `apps/api/prisma/` untouched; the only writer called is `NotificationsService.notify` | PASS |
| 14 | Notes that are not on a task behave as before | API suite "notes that are not on a task keep their rules"; `security-gate-foreign-ids-content` 19/19, `sprint-5-baseline`, `customer-history-api` 14/14 green | PASS locally |
| 14a | The tests catch what they claim (owner's quality rule) | five temporary changes to the service, one rule removed each: named-task check on list → 2 cases fail; general list not narrowed → 1; mentions not checked → 7; anyone edits → 1; comment readable by id → 1. Code restored, 23/23 | PASS |
| 15 | Web unit tests, API tests, browser suite and CI six jobs green | locally: API unit 616 pass / 10 todo / 0 fail; twelve integration suites green; web unit 440/440; whole browser suite on the isolated local stack with the final code: 142 passed, 6 skipped by design; the new spec alone 30 of 30 in five rounds on both viewports; the thread looked at on desktop and at phone size (screenshots); CI on the PR head `9f2018d`, run 44327994547: six jobs SUCCESS — isolation gate with the six G07 groups ok (23 cases), browser 142 passed / 6 skipped by design with the six `15-task-comments` cases on desktop and phone, web unit 440/440 with the four G07 groups | PASS |
| 16 | Merge and deployment on the owner's message | owner's message 2026-11-18 ("موافق … على دمج #176 بعد تأكيد نجاح فحوص التعليقات والإشارات وصلاحياتها على آخر التزام"); the checks and those groups read again on `9f2018d` from the logs before the merge; merged with `--match-head-commit` → main `1b20472` (15:41:58Z). Main CI run 44338643782: six jobs SUCCESS, browser 142 passed / 6 skipped. Railway: `jihad` `4fa017ef` and `maos-web` `498a9e46` SUCCESS on `1b20472`; `/api/health/ready` 200 (database up); the new route answers 401 without a session where an unknown route answers 404; API log: started, scheduler started, no error line. Rollback: API `a166bd4f`, web `afe5e169`. No database change | PASS |
| 17 | The thread is in what production serves | the script chunks of `/tasks` fetched from production (14 files): "People you can mention", "clients never see these comments" and the `/tasks?open=` link are present; the text of the old optional notes block is gone | PASS |
| 18 | The check on production: a comment with a mention is written on a real task, the mentioned member finds the notice in the bell and it opens the task; a client account reaches no comment | not done. It needs two signed-in members of staff on production. The session types no password there; the way that worked for E08 is a separate fictional company whose invitations the owner accepts in the app's browser pane, removed afterwards — that needs the owner's approval of the test and the clean-up, as each time. Alternative: the owner's own reading with a colleague | **PENDING — owner** |

## What was built

- **API (`modules/collaboration`)**: a note on a task follows the task on every route — list, read, write, change, delete and the general list. A mention is a token in the comment text, `@[Name](user:<id>)`; the server checks each id against the people who may read the thread (the internal-note permission as it stands for that member, and the task being visible to them), writes the real name into the token, and tells the mentioned people through `NotificationsService.notify`, keyed on the comment. New route `GET /collaboration/notes/mentionable?resourceType=task&resourceId=…` (name and id only). `modules/tasks`: deleting a task deletes its comments in the same transaction.
- **Web**: `components/tasks/task-comments.tsx` replaces the optional "Internal Notes" block of the task editor (hidden until added, newest first, add only) with a "Comments" section that is always there: thread, comment box with a list of names after `@` (keyboard and pointer), edit and delete with a question first, states for loading, empty and failed. `lib/mentions.ts` holds the string work. A task notice in the bell now opens that task (`/tasks?open=<id>`). The general notes page shows mentions as plain "@Name".

## Found on the way

| Finding | What was done |
|---|---|
| The caret jumped back when someone typed on right after choosing a name (the browser test typed faster than one screen frame; the text came out as "…@Name e Friday.befor") | fixed: the caret is set in the same commit as the name; 30 of 30 repeats afterwards |
| The general notes page (`/collaboration`) became 1,103 px too wide at phone size with one long unbroken word in a note (the F08 sweep caught it through this task's test data) | fixed with class names on that one line; the sweep now always carries such a note |
| This task's first browser run left a task assigned to the seeded employee, which another spec counts | the spec removes its task when it is done; that is also how the missing clean-up of comments on task deletion was noticed (row 2a) |

## Findings for the owner (not changed here)

1. **Contractors take no part in task comments.** By the permissions as they are (Blueprint §2.1) a CONTRACTOR has no access to internal notes, so they neither see the thread of a task assigned to them nor can they be mentioned. Opening it would be a permission decision.
2. **Notes that are not on a task are still open to every member with the permission**: an employee reads, changes and deletes any general or meeting note of the company, and the general notes page offers "Delete" on everyone's note. Only task comments were tightened here.
3. **The general notes page never shows the author** — it reads a field the API does not send, so every note says "Unknown".
4. **Mentions are in-app only**: no e-mail is sent, as for every other notice today.
5. **Not tried on a real phone**: the thread and the list of names were exercised in the browser suite's phone-sized project, not on a device with an on-screen keyboard.

## Not in this task

- E-mail or push for mentions (in-app notices only, as everywhere else today).
- Mentions outside task comments (meetings, chat).
- Giving contractors access to internal notes (a permission decision for the owner).
- Comments visible to clients (the client talks through requests, problems and deliveries).
