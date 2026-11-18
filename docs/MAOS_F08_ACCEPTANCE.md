# MAOS-F08 — The three intermittent tests: two steadied, one was a real layout defect

**Closure status (2026-11-18): DEPLOYED — the signed-in phone view on production is PENDING; not DONE.** Two tests were intermittent for reasons inside the tests; the third was right: pages really can be wider than a phone screen when a name is long. That is fixed where a sweep of every page found it (class names only, eleven files), and the sweep stays in the browser suite. No script and no API code changed. Merged as #174 on the owner's message; main CI green; both services rebuilt and healthy; the new class names are in the production bundle. Open: the owner asked for the affected pages to be seen on a phone-sized screen after the release. Every affected page needs a signed-in person; the session types no password on production, and the app's browser pane held no session. This closes when the owner signs in in the pane and the pages are measured there at phone width (reading only), or when the owner rules that the sweep on the merge commit is enough.

Origin: owner's message of 2026-11-18 — fix the off-site backup test and the D08 width test, investigate the C06 upload-cancel test, show the results before a merge that rebuilds both services. Three reruns of CI in two days came from these tests, each time on a change that could not have caused them.

## Blueprint check (§30)

No conflict: test files and class-name fixes in pages; no endpoint, schema, role, permission or script change.

## The three tests

| Test | What happened | Cause (proven) | Change |
|---|---|---|---|
| `apps/api/test/offsite-backup.test.mjs` "rehearsal fails on a tampered download or the wrong key" | main CI 2026-11-17: 510 of 511 — the rehearsal refused the copy, but with "decrypted dump checksum mismatch" instead of the expected "decryption failed" | `openssl cms -decrypt` with a wrong private key does not always report it: in 1,500 tries it reported failure 1,490 times and "success" 10 times, never with the original bytes (its guard against padding-oracle timing). The script's second guard, the plaintext checksum, then refuses the copy | the test requires the refusal (exit 1) and accepts either of the two guards' alerts; it also requires that no "passed" alert is raised |
| `apps/web/e2e/11-client-project-status.spec.ts` width check, phone | main CI 2026-11-18: 134 of 135 — horizontal overflow 6 px (limit 1 px); again on this PR's first commit: 2 px | **a real defect, not the test.** First assumed to be a reading taken while the layout settled; polling for 10 s disproved it (still 2 px). The project filter on My Work is a `<select>`, and a select is as wide as its longest option: with the test's project names it filled a 412 px screen to the pixel, so the glyph widths of the random run id decided whether it fitted. With a longer project name the page was 322 to 366 px too wide | fixed in the pages (see "The layout defect" below). The D08 test now shares a second project with a long name, so its width check is a real one every time |
| `apps/web/e2e/09-upload.spec.ts` "Cancel stops it and nothing is saved; Upload then succeeds", phone | seen three times in local whole-suite runs since 2026-11-11, never diagnosed | reproduced 2 times in 40 repeats; the page then read "Uploaded as version 2." The test released its held request and switched interception off at the same moment; when the switch-off came first (trace: `setNetworkInterceptionPatterns` before `Route.abort`), Chromium sent the held request although the page had cancelled it, and the server stored it as version 1 | the test ends the held request before it switches interception off |

## Matrix

| # | Requirement | Evidence | Result |
|---|---|---|---|
| 1 | Backup test: the cause is shown, not assumed | openssl 4.0.3, 1,500 decryptions with a wrong key: 1,490 reported failures, 10 reported successes, 0 with the original plaintext; the right key decrypts to the original | PASS |
| 2 | Backup test: still requires that a wrong key is refused, whichever guard catches it; nothing in the script changed | diff: one assertion widened, one added; suite 25 of 25 runs green locally | PASS locally |
| 3 | D08 width: the page fits a phone with a long project name in the filter; the limit stays 1 px | the changed test against the web build without the fix: overflow 322 px (fails, as it should); with the fix: the D08 spec 8 of 8 on both viewports. A first attempt (cap on the select alone) left 332 px and was corrected | PASS locally |
| 3a | Every workspace and client page, and the task editor, fits a phone screen with a long project name shared to the client | new sweep in `e2e/14-page-states.spec.ts` (phone project): 49 routes + the editor; found and fixed step by step — see below; in the whole suite: passed | PASS locally |
| 4 | C06 cancel test: failure reproduced before the change | 2 failed of 40 repeats at phone width, same error as the earlier sightings ("Uploaded as version 1." not found; the page says version 2) | PASS (reproduced) |
| 5 | C06 cancel test: cause found in the trace and removed | order of `Route.abort` and the interception switch-off; after the change 80 of 80 repeats at phone width and 40 of 40 on desktop | PASS locally |
| 6 | What the tests assert is unchanged otherwise: no version after Cancel, exactly one version after the next Upload | diff of `09-upload.spec.ts`: ordering only | PASS |
| 7 | Nothing else broke | web `npm test` 427/427, web type-check clean, API type-check as in CI (`tsconfig.build.json`) clean; whole browser suite locally with the final code: 136 passed, 6 skipped by design | PASS locally |
| 8 | CI: six jobs green on the PR head | PR #174, run 44305987343 on `4637c66`: Secret scan, Dependency audit, Isolation gate, Web, Browser smoke, API all SUCCESS; browser 136 passed, 6 skipped by design; the phone-width sweep passed at phone size | PASS |
| 9 | Merge when authorised — rebuilds `jihad` (test file only, identical application code) and `maos-web` (the layout fixes) | owner's message 2026-11-18 ("موافق على دمج #174 بعد التأكد إن فحوص آخر التزام خضراء"); the six checks read again on `4637c66` before the merge; merged with `--match-head-commit` → main `04a4b82` at 14:14:35Z | PASS |
| 10 | Main CI green on the merge commit | run 44322114503 on `04a4b82`: six jobs SUCCESS; browser 136 passed, 6 skipped by design; `Every page fits a phone screen` passed at phone size (it is skipped at desktop size by design) | PASS |
| 11 | Both services built and healthy | Railway: `jihad` `a166bd4f` SUCCESS and `maos-web` `afe5e169` SUCCESS, both on `04a4b82`. API `/api/health/ready` 200 (database up), `/api/health` 200, `/api/auth/me` without a token 401, sign-in page 200; API log: started, scheduler started, no error line besides that probe's 401. Rollback: API `1ada64a5`, web `3b336286` | PASS |
| 12 | The fix is in what production serves | the script chunks of `/time`, `/client/deliveries`, `/complaints`, `/tasks`, `/client/problems` fetched from production (21 files): the new class strings are present (`grid grid-cols-1 gap-3` of the time form, `min-w-0 max-w-full` of the two selects, `grid grid-cols-1 gap-6` of the page roots) | PASS |
| 13 | The affected pages seen on a phone-sized screen on production (owner's condition for closing) | the sign-in page at 375 px: 0 px too wide. Every affected page needs a signed-in person; the pane held no session and the session types no password on production. On the same commit the sweep of row 10 measured all 49 routes and the task editor at phone size with a long project name, on the isolated stack | **PENDING — needs the owner's sign-in in the pane, or the owner's ruling** |

## The layout defect (found through the D08 width test)

A CSS grid with one implicit column (`grid gap-6` and the like) makes that column as wide as its widest child. Two kinds of children cannot shrink: a `<select>`, which is as wide as its longest option, and text that is cut with an ellipsis (`truncate`), whose natural width is the whole text. So one long project name, or one long file name, made a whole page wider than a phone screen; fields slid out of view and the person had to scroll sideways.

How it came out, step by step (each step measured in a browser at 412 px, with a project named with 80 to 90 characters shared to the client):

| Step | What was measured | Result |
|---|---|---|
| 1 | Client's My Work with the long name in the project filter | 322–366 px too wide |
| 2 | After the fix there, CI and the local suite failed in another place: an employee could not finish moving a task in the task editor at phone width (30 s timeout). Screenshot: the editor was wider than the screen | the long name sits in the editor's project select |
| 3 | Every page measured (49 routes) | too wide: `/time` 436 px, `/finance/invoices/:id` 102 px, `/client/deliveries` 49 px, `/client` 11 px |
| 4 | After those fixes, the sweep inside the whole suite (more data) | `/client/problems` 11 px, `/complaints` 3 px |
| 5 | After all fixes | no page and not the task editor is wider than the screen; whole suite 136 passed |

What changed in the application — class names only, no logic (`grid-cols-1` gives the single column leave to shrink; `min-w-0` does the same for a cell; `max-w-full` caps a select):

| File | Change |
|---|---|
| `app/(client)/client/deliveries/page.tsx` | page grid and its two nested lists `grid-cols-1`; filter label `min-w-0`, select `min-w-0 max-w-full` |
| `src/components/client-portal/client-project-progress.tsx` | panel and its list `grid-cols-1` |
| `src/components/dashboard/client-dashboard-summary.tsx` | overview grid `grid-cols-1` |
| `app/(client)/client/problems/page.tsx`, `…/requests/page.tsx` | page and form grids `grid-cols-1` |
| `app/(workspace)/complaints/page.tsx`, `…/requests/page.tsx` | page and inner grids `grid-cols-1` |
| `app/(workspace)/time/page.tsx` | form `grid-cols-1` below `sm`, its labels `min-w-0` |
| `app/(workspace)/finance/invoices/[id]/page.tsx` | page grid `grid-cols-1` |
| `app/(workspace)/tasks/page.tsx` | project filter select `min-w-0 max-w-full` |
| `src/components/tasks/task-modal.tsx` | the editor's field cells `min-w-0` |

Where a page already fitted, nothing looks different: the column is as wide as before; it only stops growing past the screen.

## Findings (not changed here)

1. **A product gap behind the C06 case.** Cancel only aborts the browser's request and then always says "Upload cancelled. Nothing was saved." If the whole file had already reached the server (small files, or Cancel during "Sent. Saving on the server…"), the server can still store the version, and the sentence is then untrue. C06's record describes a server confirmation that the code does not make. The duplicate guard for Try again already knows how to look for such a version; the same look after a Cancel would make the sentence true ("Your file had already arrived as version N"). Proposed as its own small task (C10), not done here.
2. `npm run typecheck` in `apps/api` fails locally with 149 errors in three old Jest-style `*.spec.ts` files (no Jest types installed); CI type-checks with `tsconfig.build.json`, which leaves them out, and is green. The spec files are not run by any job.
3. A wrong first diagnosis is part of this record: the width failure was taken for a timing problem and "fixed" with a retry; CI showed the same failure with the retry in place, and only then was the page measured element by element.
4. The same pattern (`grid gap-N` without `grid-cols-1`) is used on many other pages; they fit today with the names and files of the test data, long ones included. The sweep now fails if one of them stops fitting.
