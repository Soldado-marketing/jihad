# MAOS-C09 — Upload: the file is sent once when the access token has expired

**Closure status (2026-11-16): DONE.** #169 merged (main `27821a0`), `maos-web` deployed, main CI six jobs SUCCESS. Production check on 2026-11-16 under O62: with an access token that had really run out, the browser renewed it first and sent the upload once; fictional data removed to the seed-time baseline (production record below). Rows 1–10 PASS. Written before implementation (owner's rules of 2026-11-04: checklist from the original specification first, independent comparison before closure).

Origin: owner's request of 2026-11-16 after a comparison of `apiFetch`, `apiBlob` and `apiUpload` at the end of a session ("نعم، أصلحه"): fix the double upload when the access token has expired, as a small task with a test. Follow-up of C06 (upload progress, cancel and error recovery).

## The defect to prove first

Access tokens live 15 minutes. `apiUpload` sends the whole file, and only when the server answers 401 does it renew the token and send the whole file again. For JSON requests and downloads that retry costs nothing; for an upload it doubles the transfer, and during the second pass the uploader shows "Saving" with no progress, because progress events are ignored once the first pass has been sent. Read from the code; row 1 proves it in a browser before anything is changed.

## Blueprint check (§30)

No conflict: web only; authentication and the refresh rotation stay on the server and are used as they are; no schema, endpoint, role or permission change. The token is only read on the client to decide when to renew — it is never trusted for access.

## Scope

In: `apiUpload` renews an expired access token before the first send. Out (unchanged, recorded as findings in the comparison): the sign-in page does not say why the person was sent there; after sign-in the person lands on the home page, not where they were; an upload whose session has really ended is still sent once before the sign-out. `apiFetch` and `apiBlob` are not touched.

## Matrix

| # | Requirement | Evidence | Result |
|---|---|---|---|
| 1 | The defect is real: with an expired access token and a valid session, the browser sends the upload request twice (current `main`) | the new browser test against a web build without the fix: requests in order `upload, refresh, upload` on desktop and phone (test failed as intended) | PASS (defect proven) |
| 2 | After the fix the upload request is sent exactly once in that situation, the token is renewed first, and the file is stored as version 1 | `e2e/09-upload.spec.ts` "with an expired token the file is sent once, after the token was renewed": one `upload`, `refresh` before it, version list `[1]`, the stored token is the renewed one and `/auth/me` answers 200 with it; desktop and phone | PASS (local and CI) |
| 3 | A token that is still valid is not renewed before an upload (no extra refresh, one send) | browser test "with a valid token nothing is renewed…": requests exactly `[upload]`; unit tests for the margin | PASS (local and CI) |
| 4 | A token that cannot be read (not a JWT, no expiry) changes nothing: the old path stays (send, 401, renew, send) — no sign-out by guesswork | `test/token-expiry.test.mjs`: 15 unreadable inputs give `null` and are never "expired"; the 401 path in `apiUpload` asserted unchanged | PASS (local and CI) |
| 5 | If renewing before the send does not work, behaviour is the old one (the send goes out with the stored token; a 401 then ends the session as before) | browser test "when the session cannot be renewed…": first request `refresh`, at most one `upload`, the person lands on the sign-in page, nothing saved; source check for the fallback | PASS (local and CI) |
| 6 | The expiry check is pure, tolerant of malformed input and uses a small margin (30 s) | `test/token-expiry.test.mjs`: 11 tests | PASS (local and CI) |
| 7 | C06 behaviour is unchanged: progress, cancel, lost connection, duplicate guard, busy server, refused file | `e2e/09-upload.spec.ts` whole file: 14 passed (the four C06 tests and the three C09 tests, desktop and phone); `test/upload-state.test.mjs` green | PASS (local and CI) |
| 8 | Nothing else changed: web type-check, web unit tests, whole browser suite | `tsc --noEmit` clean; `npm test` 414 tests, 414 pass; browser suite 114 passed | PASS (local and CI) |
| 9 | CI: six jobs green on the PR head | PR #169, run 43878178672 on `4d2a7f2`: six jobs SUCCESS; the three C09 browser tests passed on desktop and phone (114 passed) | PASS |
| 10 | Merge and web deployment when authorised (web only; no migration, no API change); production check: an upload after the token expired | owner's message "نعم، ادمجه"; #169 → main `27821a0` 15:04:14Z with `--match-head-commit`; `maos-web` `4fd4d138` SUCCESS (the API deployment was skipped by Railway, `jihad` unchanged); main CI run 43892423886 six jobs SUCCESS; the check is in the deployed bundle; smoke identical; production record below | PASS on 2026-11-16 |

## Run record (2026-11-16, local stack: disposable PostgreSQL 16, storage stub, API and web built from this branch, fictional people)

- Before the fix (web built from `main`'s `fetch.ts`): the test with an expired token failed on desktop and phone with `requests in order: upload, refresh, upload`; the test with a valid token passed. Of the eleven unit tests, the two that require the pre-check in `apiUpload`'s source failed; the other nine passed (seven on the helper, two on the unchanged 401 path).
- The change: `apps/web/src/lib/token-expiry.ts` (new, pure) and eleven lines in `apiUpload` (`apps/web/src/lib/fetch.ts`): a token that says it has ended, or ends within 30 seconds, is renewed through the existing single-flight refresh before the first send; otherwise nothing changes.
- After the fix: `e2e/09-upload.spec.ts` 14 passed; `npm test` 414/414; whole browser suite 114 passed; type-check clean.
- The test's "expired" token is the session's own token with `exp` moved two minutes into the past: the server refuses it because the signature no longer fits, as it refuses a token that ran out, and the browser reads the past `exp`.

## Production record (O62, 2026-11-16)

Owner approvals in chat: "موافق على الفحصين" (O62, one fictional company for both checks, 2026-11-16). Method: seed and cleanup rehearsed twice on a disposable local database with the built API and the storage stub; one separate fictional company `e08-mwjgo4kw389b` written through the private tunnel (1 project, 1 task, 3 invites `@e08.fiktiv.test`, no user and no password); the OWNER accepted each invite and signed in as each fictional person in the browser pane with passwords of their own choice — the session typed no password on production; each person's tokens stayed in the pane only. Seed-time baseline: tenants 1, users 4, memberships 4, customers 0, projects 2, tasks 0, invites 3, invoices 1, files 2, file versions 0, approvals 1.

| Step | Result |
|---|---|
| The expired token | the fictional Owner's own first access token, kept in the pane: issued at sign-in 18:56:56Z, ended 19:11:56Z; at the test (19:22:23Z) it had been over for ten minutes and `GET /auth/me` with it answered 401. Not a forged token. Same user and same session as the current valid token |
| Setup as the fictional Owner | file record created through the API (201), file page opened in the pane, a 1×1 PNG chosen in the uploader; then the stored access token was replaced by the expired one and Upload was pressed in the same step, so no other request could renew it first |
| Requests the page sent, in order | `POST /auth/refresh` → 200 after 175 ms; `POST /files/:id/versions` → 201 after 606 ms. **One upload request, one refresh before it** |
| The page | "Uploaded as version 1." |
| Server | version list `[1]`; the browser now holds the renewed token, not the expired one |
| Cleanup | file deleted through the application first (204; the file answers 404 afterwards, no file left in the company); then 1 company (cascade), 3 users, 9 audit rows, 7 sign-in rows deleted. After cleanup every count equals the seed-time baseline; leftovers 0 for companies, users, memberships, invites, projects, tasks, files, file versions, sessions, devices, audit, sign-in history, notifications, permissions. Tokens removed from the pane, pane closed, tunnel closed, readiness 200. The real company was not written |

Not covered on production: a large file (the check used a 1×1 PNG, so the saved transfer is shown by the request count, not by time), and the phone width (covered by the browser tests in CI).


## What this does not change

- An upload whose session has really ended (removed, suspended, refresh token expired) is still sent once before the person is signed out. Avoiding that needs the refresh to tell "refused" from "not reachable"; left out to keep this change small.
- A browser clock that is far behind does not see the expiry and takes the old path (two sends); a clock that is ahead renews earlier than needed, which is harmless.
- The sign-in page still does not say why the person was sent there, and after sign-in the person lands on the home page (both belong to F04).
