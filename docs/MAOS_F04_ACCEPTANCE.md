# MAOS-F04 — Loading, empty, error and access-denied states across pages

**Closure status (2026-11-18): PART 2 READY FOR REVIEW — not DONE.** Part 1 (#171, merged and deployed 2026-11-17): a failed load is never shown as "nothing here", zero or "not found". Part 2 (this PR), after the owner's decision of 2026-11-17 — "do not change the look of sound pages; go back to the original acceptance list, determine what is still mandatory and finish it before F04 is DONE": the four states were checked on every page in a browser, the five gaps found were closed, and a test now holds every page to the four states. Open: CI on this PR, the owner's merge message, the web deployment. Written before the changes were finished and filled from the inventory (owner's rules of 2026-11-04: checklist from the original specification first, independent comparison before closure).

Task row: "Inventory every page; reuse `components/states/*`; fix inconsistent ones. Acceptance: every workspace and client page has the four states; test asserts the primitives are used."

## Blueprint check (§30)

No conflict: web only; no endpoint, schema, role or permission change; the API's own sentences for people are shown as they are (F02).

## Inventory (2026-11-17, main `60b1d3d`)

73 pages: 59 load data, 14 are static or redirects. Of the 59, counted through each page and the components it renders:

| Shared component | Pages using it |
|---|---|
| `LoadingState` | 2 |
| `EmptyState` | 3 |
| `ErrorState` | 10 |
| `DeniedState` / `UnauthorizedState` | 1 / 1 |
| all four | 0 |

Almost every page shows the states with its own short texts ("Loading…", "No … yet.", an inline red sentence). Those work. What did not work:

| Class | What the person saw | Where | In this PR |
|---|---|---|---|
| A — a failed list load was swallowed | the empty sentence or zeros: "No revenue records yet.", "No notifications.", four zeros in the CRM overview, "You are all set" and "All invoices are paid" in the client overview | 15 pages and components | fixed |
| B — a failed detail load became `null` | "… not found." for a server fault, a lost connection or a refusal alike | 10 detail pages | fixed |
| C — an option list for a form, or optional data, could not be loaded | an empty dropdown or a hidden optional part; nothing untrue is said | 18 places | left, listed in the test with the reason |
| D — a background action or a refresh after an action failed | the page stays as it was | 7 places | left, listed in the test with the reason |
| `alert()` for a failed action | a browser dialog instead of a sentence on the page | 20 uses in 10 pages | not in this PR (part 2) |

## Scope of this PR

In: classes A and B — the shared `ErrorState` with the reason and "Try again"; one test that fails when a page swallows a failed request outside a reviewed list. Out: restyling states that work (owner's rule: no change to sound code without a proven reason), `alert()`, the sign-in page's missing reason after a session ended, the return to the previous page after sign-in.

## Matrix

| # | Requirement | Evidence | Result |
|---|---|---|---|
| 1 | Inventory of every page and its four states | table above; script result kept in the run record | PASS |
| 2 | Class A: a failed list load shows the shared error box with the reason and "Try again", and the empty sentence or the zeros are not shown | client: notifications, problem reports, work requests, overview; workspace: notifications, revenue, costs, CRM overview, collaboration, voice notes, chat (channels and messages); components: review rounds of a file, project appointments, subtasks in the task editor, channel members | PASS locally |
| 3 | The client overview never says "You are all set" or "All invoices are paid" for a part that failed; the card of that part reads "could not be loaded" | unit test + browser test | PASS locally |
| 4 | Class B: a failed detail load shows the reason and "Try again" instead of "… not found." for every failure; a record that really does not exist still reads as not found | lead, opportunity, approval, voice note, task draft, task, file, invoice (workspace and client), report; browser tests for the task page (500 and a missing id) | PASS locally |
| 5 | "Try again" loads again and the page recovers | browser tests: each case ends with the route restored, Try again pressed and the error gone | PASS locally |
| 6 | Guard: a test reads every page and component and fails on a swallowed failed request that is not in the reviewed list; the list is exact (no stale entries) and each entry names its reason | `test/load-failures-visible.test.mjs`, 5 tests | PASS locally |
| 7 | Existing tests untouched and green; the one that pins the client overview's four routes still passes unchanged | `npm test` 419/419; `tsc --noEmit` clean | PASS locally |
| 8 | Browser suite: the new spec on desktop and phone, and nothing else broken | `e2e/13-load-failures.spec.ts` 16 passed; whole suite 130 passed (second run; see the run record for the first) | PASS locally |
| 9 | CI: six jobs green on the PR head (part 1) | PR #171, run 44110292388 on `6a285f5`: six jobs SUCCESS, browser suite 130 passed | PASS |
| 10 | Merge and web deployment when authorised (part 1, web only) | owner's message; #171 → main `5676602` 2026-11-17 15:15:46Z; `maos-web` `1f7f6274` SUCCESS, API skipped; main CI six jobs SUCCESS on the second attempt (the first failed on an unrelated intermittent off-site-backup test); the new error texts are in the production bundles; smoke identical | PASS |
| 11 | Restyling every page onto the shared components and replacing `alert()` | owner's decision 2026-11-17: not wanted — the look of sound pages stays | DROPPED by the owner (O63) |

## Part 2 — what the original acceptance still required (owner's decision of 2026-11-17)

Original acceptance: "Every workspace and client page has the four states; test asserts the primitives are used." With the look of sound pages left alone, what stays mandatory is: (a) every page really has the four states, proven on screen and not by reading patterns; (b) where a state was missing or untrue, it is added — with the shared components; (c) a test holds every page to it from now on.

How it was checked (local stack, fictional people, before any change of part 2):

- **Error:** every workspace and client page (48 routes, among them 8 with a record id) was opened while every API read answered 500, and what the page showed was recorded.
- **Access denied:** a manager and an employee opened all 34 workspace routes without an id; every 403 from the API and what the page said were recorded.
- **Loading / empty:** read from the source of each page and the components it renders; unhandled requests searched with the TypeScript compiler (none left: the four reads flagged are caught by their callers).

| Gap found | Where | Fix |
|---|---|---|
| A failed load read as "No files yet." (an empty catch across three lines, missed by part 1's one-line pattern) | `/files` | shared `ErrorState` with the reason and Try again; the empty sentence only after a successful load |
| "Loading…" stayed on screen beside the error | `/complaints`, `/requests` (also for an employee who is refused) | "Loading…" ends when the load failed |
| "No invitations yet." stood beside the error | `/team/invitations` | no empty sentence when the load failed |
| No loading state: "No channels yet." and "No messages yet." showed while the lists were still loading | `/chat` | shared `LoadingState` for channels and for messages |

Nothing else was changed. The other pages already had the four states in their own words; three pages read only the person's own data and say "could not be loaded" instead of a refusal (dashboard, settings, client overview) — named in the test.

| # | Requirement (original acceptance) | Evidence | Result |
|---|---|---|---|
| 12 | Loading on every page that loads data | `test/page-states.test.mjs` (every page, one named exception: `/data` loads nothing when it opens); browser: the chat shows "Loading channels" while the request is held and no "No channels yet." | PASS locally |
| 13 | Error on every page: a failed load is said, loading ends, no empty sentence beside it | `e2e/14-page-states.spec.ts`: all 33 workspace routes + 6 with an id as the Owner, all 7 client routes + 2 with an id as a client, every read answering 500 | PASS locally (3.1 s and 0.7 s) |
| 14 | Access denied on every page whose data a role may not read: said in words, loading ends | same spec: a manager on 9 routes, an employee on 16 routes; `test/page-states.test.mjs` requires the reason of a refusal to reach the screen on every data page except three named own-data pages | PASS locally |
| 15 | Empty on every page with a list | `test/page-states.test.mjs`: 13 pages without a list are named with the reason; every other data page has its sentence | PASS locally |
| 16 | "Test asserts the primitives are used" | the states F04 added use the shared components and tests require it: `ErrorState` with a retry in 25 places (`test/load-failures-visible.test.mjs`), `LoadingState` in the chat (`test/page-states.test.mjs`). Existing states keep their look by the owner's decision | PASS locally |
| 17 | Every page is classified, so a new page cannot skip the four states | `test/page-states.test.mjs`: exact lists of pages without data (11) and without a list (13); the browser sweep must list every data page without an id | PASS locally |
| 18 | The swallow guard also sees empty catch blocks that span lines | `test/load-failures-visible.test.mjs`: pattern across lines; 32 reviewed entries in 20 files, each with its reason | PASS locally |
| 19 | Nothing else broke: type-check, all web unit tests, whole browser suite | `tsc --noEmit` clean; `npm test` 427/427; whole browser suite: CI (see the run record — the local machine stalled) | OPEN — CI |
| 20 | Merge and web deployment when authorised (web only) | — | OPEN — owner's merge message |


## Run record (2026-11-17, local stack: disposable PostgreSQL 16, storage stub, API and web built from this branch, fictional people)

- Inventory script over `apps/web/app/**/page.tsx` and the components each page imports (three levels): the table above. Swallowed failures before: 56 in 37 files; after: 27 in 17 files, all in the reviewed list (options 14, permission 3, fallback 1, action 4, reload 3, unused 2).
- `npm test`: 419 tests, 419 pass. Type-check clean.
- Browser: spec 13 alone 16 passed (after two corrections to the spec itself: a missing task's sentence is the API's "Task not found", and the dashboard case was dropped — see findings). Whole suite: first run 129 passed, 1 failed — the known intermittent C06 case "Cancel while sending" at phone width, not touched here; the upload spec then passed 3 of 3 alone (14 tests each) and the second whole run passed 130 of 130.
- One change was taken back during the work: `WorkspaceSummaryGrid` is rendered by no page, so it was left as it is and listed as unused.

### Part 2 (2026-11-17/18)

- Discovery sweeps (temporary spec, not committed): failure sweep — 46 of 48 routes said that the load failed; `/files` showed "No files yet."; `/team/members` was a false alarm of the sweep itself (its read lives under `/api/auth/`, which the first sweep did not fail); `/complaints` and `/requests` kept "Loading…"; `/team/invitations` kept "No invitations yet.". Refusal sweep — every refused page said so; `/complaints` and `/requests` kept "Loading…" for the employee; `/tasks` gets one refused option list (members) and works.
- After the fixes: `npm test` 427/427 (8 new in `page-states`, guard widened), type-check clean. `e2e/14-page-states.spec.ts` on desktop: both error sweeps passed (twice, 3.4 s / 3.1 s and 0.8 s / 0.7 s), the chat loading case passed (three times), the two refusal sweeps passed (1.1 s and 1.4 s) in the first run.
- Later local runs are not evidence: the Mac suspended the processes for long stretches (single tests "took" 2 to 15 minutes, a whole run 21 minutes), the 15-minute sessions of the seeded people ran out and the pages went to the sign-in page. `caffeinate` did not help. The whole browser suite with the final code is therefore left to CI.


## Findings (not changed here)

1. The dashboard hides its company-numbers section when the summary cannot be loaded; nothing untrue is shown, but nothing says that a section is missing.
2. `alert()` is used for failed actions in 10 pages (reports, chat, collaboration, CRM follow-ups, leads, meetings, opportunities, payments, project detail, voice).
3. Two components are rendered by no page: `ClientProjectDetail` and `WorkspaceSummaryGrid`.
4. The intermittent C06 upload-cancel case at phone width was seen again once in a whole-suite run.
5. From the earlier comparison (2026-11-16): the sign-in page does not say why the person was sent there after a session ended, and after sign-in the person lands on the home page instead of where they were.
