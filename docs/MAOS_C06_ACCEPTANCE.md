# C06 — acceptance checklist and evidence matrix

**Task (master task list, row C06):** Upload progress, cancel and error recovery in the browser. Notes: `apiUpload` already uses XHR progress; verify the UI shows progress, cancels, retries after a network error; add tests. Acceptance: progress bar, cancel, clear error and retry verified on the isolated stack.

Written before implementation (owner's rules of 2026-11-04: checklist from the original specification first, one task at a time, independent comparison before closure; functional tests, never page-load checks). Status values: PASS (test or measurement named, green locally and in CI) · OPEN · BLOCKED — OWNER.

## Audit before coding (2026-11-05, main `14d950a`)

| Area | Finding |
|---|---|
| Upload transport | `apiUpload` (`apps/web/src/lib/fetch.ts`) sends multipart over `XMLHttpRequest`, reports `onProgress(percent)` from `xhr.upload.onprogress` (only when `lengthComputable`), maps a network failure to the plain `NETWORK_MESSAGE`, retries once after a 401 by refreshing the token (progress silently restarts at 0), and has an `onabort` handler that **nothing can trigger**: no `AbortSignal`, no cancel. No timeout. Progress reaches 100 % when the body has been written, while the server still validates the signature and writes to object storage — the UI shows "100 %" and "Uploading…" during that wait. |
| Upload surfaces | One: `FileUploader` (`components/files/file-uploader.tsx`) on the workspace file page (`file-detail.tsx`), staff only (file or `https:` link stored as a `.url` shortcut). The CSV import on `/data` reads the file in the browser and posts JSON through `apiFetch` (no binary upload). Clients upload nothing. |
| Current UI | Progress bar (`role=progressbar`, `aria-valuenow`) + percent while busy; `role=alert` error; success line "Uploaded as version N." **No Cancel.** After a failure the chosen file stays selected and Upload is enabled again, so a retry is possible but unnamed (no "Try again"); the error does not say whether retrying can help. A wrong `.mp4`, an oversized file, a lost connection and a session expiry all read the same way apart from the sentence. |
| Error wording from the API | `FILE_TOO_LARGE` → 400 with reason "Uploaded file exceeds the maximum size of 26214400 bytes." (passes `isPlainMessage`, so the person sees a byte count); multer hard ceiling → 413 "File too large"; `UNSUPPORTED_FILE_TYPE` → 400 with a plain sentence ("File content does not match the mp4 format."). Mapping in `api-errors.ts` (F02) is unchanged by this task. |
| Retry hazard | A retry after a network error can create a **duplicate version** when the server stored the file but the response never arrived (connection dropped after the body was sent). The versions list (`GET /files/:id/versions`: `versionNumber`, `originalName`, `sizeBytes`, `createdAt`) is enough to detect that case before re-sending. No idempotency key on the upload endpoint; adding one would be an API change outside the task note. |
| Tests today | e2e `02-owner` uploads one PNG and checks "Uploaded as version 2." (happy path only). `plain-language-errors.test.mjs` pins `apiErrorMessage` use in `apiFetch`/`apiUpload`/`apiBlob` and the network-failure rejection. No test covers progress, cancel or a failed upload in the browser. |
| Graphify dependents | `apiUpload` ← `FileUploader` only. `FileUploader` ← `FileDetail`. `validateUpload` (API) ← `FileVersionsService.upload`; its messages are asserted by code (`FILE_TOO_LARGE`, `UNSUPPORTED_FILE_TYPE`), not by sentence. |
| Blueprint §30 | Web UX on the existing upload path; no new module, schema, migration, authorization, tenant-scope, finance or integration change (checks 1–6, 9–11 clear). Production/Railway: web redeploy (API redeploy only if the limit sentence changes). Approved exact next task after C05 (12). No conflict. |
| Out of scope (recorded, not reduced) | Showing the upload limit before a file is picked and confirming the Railway edge body size (C01 remainder, owner gate O6). Multi-file upload (D-section). |

## Acceptance matrix

| # | Requirement (original wording / owner rule) | Evidence: test or measurement | Functional? | Status |
|---|---|---|---|---|
| 1 | Progress shown while the body is sent: `role=progressbar` with `aria-valuenow` rising from 0 towards 100 and the percent as text; after the body is sent the state reads as the server saving the file (not "100 % uploading") | e2e `09-upload` with a delayed route (desktop + mobile); unit test of the state machine | yes | OPEN |
| 2 | Cancel: a Cancel control is available during the upload; it aborts the request (`xhr.abort`), the UI says the upload was cancelled and the file was not saved, the chosen file stays selected, Upload is enabled again; the API has **no new version** | e2e `09-upload` (route holds the request; versions list checked through the API after cancel) | yes | OPEN |
| 3 | After cancel a new Upload of the same file succeeds (exactly one new version) | e2e `09-upload` | yes | OPEN |
| 4 | Network error (connection lost while sending): plain message (`NETWORK_MESSAGE`) + a "Try again" control; the file stays selected; no new version | e2e `09-upload` (route aborted once); unit test of error classification | yes | OPEN |
| 5 | Try again after a network error re-sends the same file without re-picking it and succeeds with exactly one new version | e2e `09-upload` | yes | OPEN |
| 6 | Response lost after the server stored the file: Try again detects the version that did arrive (same name, same size, created after the attempt began) and reports it instead of creating a duplicate; the API has exactly one new version | e2e `09-upload` (route fetches the real response, then aborts it); unit test of the duplicate guard | yes | OPEN |
| 7 | Server rejection that retrying cannot fix (wrong content for the extension, unsupported type, too large): a clear sentence, **no** Try again, the person can choose another file | e2e `09-upload` (fake `.mp4`); unit test of error classification | yes | OPEN |
| 8 | The size message names sizes people read (MiB/KB, with the limit), not a byte count; the machine code stays `FILE_TOO_LARGE` | API unit test on `validateUpload`; `video-large-files` still asserts the code | yes | OPEN |
| 9 | Session expiry during an upload keeps today's behaviour: one silent refresh and re-send; if that fails, the session message and the sign-in page | `plain-language-errors.test.mjs` (unchanged assertions) + code review | — | OPEN |
| 10 | No double submit: Upload, Add link and the file input are disabled while an upload runs; Cancel is the only enabled control | e2e `09-upload` (state during the held request) | yes | OPEN |
| 11 | Mobile: the same flow on the Pixel 7 profile; Cancel and Try again at least 44 px tall and reachable without horizontal scroll | e2e `09-upload` mobile project; class review | yes | OPEN |
| 12 | Accessibility: progress has a label and value; status changes are announced (`aria-live` / `role=status` for the phase text, `role=alert` for errors) | e2e locators by role; code review | — | OPEN |
| 13 | The happy path and C05 are unchanged: `02-owner` upload test and `08-video` still pass; regression suites (web static, API unit/integration, isolation gate) green | local runs + CI | — | OPEN |
| 14 | Tests run in CI: new web unit test in the `web` job (`node --test test/*.test.mjs`), `09-upload` in `e2e-smoke` (desktop + mobile), API unit test in the `api` batch | `.github/workflows/ci.yml` (new files are picked up by the globs) | — | OPEN |
| 15 | Graphify: dependents of `apiUpload`, `FileUploader` and `validateUpload` reviewed after the change; `graphify update .` run | audit table above + post-change query | — | OPEN |
| 16 | Security: cancel and retry call the same guarded endpoint with the same bearer token; nothing new is stored in the browser; no storage key or URL reaches the page; error sentences name no internals (`isPlainMessage`) | code review + existing F02 test | — | OPEN |
| 17 | CI fully green on the final head; PR with this matrix; planning files, panel and checkpoint updated | PR checks, `docs/master-plan` | — | OPEN |
| 18 | Merge, deploy (web; API if row 8 changes it) and production verification when authorised: upload a small file as a fictional OWNER with progress visible, cancel one upload, retry one after a simulated loss (browser offline toggle), remove the data | release record | — | BLOCKED — OWNER (requested only after rows 1–17 are PASS) |

## Run record

Filled from the final local run and the CI run on the final head.

| Where | Result |
|---|---|
| Before the change (baseline, main `14d950a`) | to be recorded |

## Scope notes

- The upload stays a single request with the whole file in one multipart body (server design: multer memory storage, 25 MiB default / 100 MiB ceiling). Resumable or chunked uploads are not part of this task; "retry" re-sends the file.
- Cancel aborts the browser request. If the body had already been fully received, the server may still store the version (it validates and writes after the request completes); the UI's cancel message therefore says the file was not saved only when the server confirms no new version — see row 2 for the check the test makes, and the duplicate guard (row 6) covers the same window for retries.
