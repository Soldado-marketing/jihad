# MAOS-F04 — Loading, empty, error and access-denied states across pages

**Closure status (2026-11-17): PART 1 READY FOR REVIEW — not DONE.** Part 1 (this PR): a failed load is never shown as "nothing here", zero or "not found". Part 2 (moving every page's ad-hoc loading and empty texts onto the shared components) is an owner decision and is not started. Written before the changes were finished and filled from the inventory (owner's rules of 2026-11-04: checklist from the original specification first, independent comparison before closure).

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
| 9 | CI: six jobs green on the PR head | PR | OPEN |
| 10 | Merge and web deployment when authorised (web only) | — | OPEN — owner's merge message |
| 11 | Part 2 — every page uses the shared `LoadingState` / `EmptyState` / `DeniedState`, `alert()` replaced, test asserts the components are used on every page | owner decision: about 55 pages of working presentation would change | NOT STARTED |

## Run record (2026-11-17, local stack: disposable PostgreSQL 16, storage stub, API and web built from this branch, fictional people)

- Inventory script over `apps/web/app/**/page.tsx` and the components each page imports (three levels): the table above. Swallowed failures before: 56 in 37 files; after: 27 in 17 files, all in the reviewed list (options 14, permission 3, fallback 1, action 4, reload 3, unused 2).
- `npm test`: 419 tests, 419 pass. Type-check clean.
- Browser: spec 13 alone 16 passed (after two corrections to the spec itself: a missing task's sentence is the API's "Task not found", and the dashboard case was dropped — see findings). Whole suite: first run 129 passed, 1 failed — the known intermittent C06 case "Cancel while sending" at phone width, not touched here; the upload spec then passed 3 of 3 alone (14 tests each) and the second whole run passed 130 of 130.
- One change was taken back during the work: `WorkspaceSummaryGrid` is rendered by no page, so it was left as it is and listed as unused.

## Findings (not changed here)

1. The dashboard hides its company-numbers section when the summary cannot be loaded; nothing untrue is shown, but nothing says that a section is missing.
2. `alert()` is used for failed actions in 10 pages (reports, chat, collaboration, CRM follow-ups, leads, meetings, opportunities, payments, project detail, voice).
3. Two components are rendered by no page: `ClientProjectDetail` and `WorkspaceSummaryGrid`.
4. The intermittent C06 upload-cancel case at phone width was seen again once in a whole-suite run.
5. From the earlier comparison (2026-11-16): the sign-in page does not say why the person was sent there after a session ended, and after sign-in the person lands on the home page instead of where they were.
