# C05 — acceptance checklist and evidence matrix

**Task (master task list, row C05):** Video playback and download verification (MP4/MOV, large files). Notes: isolated stack with object storage; upload a 100 MB MP4; inline playback in the file page and in the client delivery; range requests; download; measure. **Acceptance:** playback and download PASS at 25 and 100 MiB; range requests honoured. **Depends on:** C02 (video upload/playback/download DONE_ISOLATED up to 25 MiB; above 25 MiB gated by `FILE_MAX_UPLOAD_BYTES`, hard ceiling 100 MiB — a configured, not broken, dependency).

Written before implementation (owner's rules of 2026-11-04: checklist from the original specification first, one task at a time, independent comparison before closure; functional tests, never page-load checks). Status values: PASS (test or measurement named, green locally and in CI) · OPEN · BLOCKED — OWNER.

## Audit before coding (2026-11-05, main `5f12968`)

| Area | Finding |
|---|---|
| Download path | Bytes are streamed through the API (`writeDownloadResponse` in `files.controller.ts`, shared with `client-files.controller.ts`). `StorageService.getObjectStream` issues a plain `GetObject`; the `Range` request header is ignored, every response is `200` with the full body and no `Accept-Ranges`. **Range requests are not honoured today** → C05 criterion fails before any change. Safari/iOS refuse to play a `<video>` whose server answers a `bytes=0-1` probe with `200`; Chromium tolerates it. |
| Workspace file page | `file-version-list.tsx` previews only `png/jpe?g/gif/webp/pdf`; `file-version-compare.tsx` renders image and PDF only. **No inline video playback in the file page** → criterion fails today. The browser plays from a blob object URL fetched with the bearer token (no storage key or pre-signed URL reaches the browser). |
| Client delivery page | `(client)/client/deliveries/[id]/page.tsx` renders `<video src={blobUrl} controls playsInline>` for `kind === 'video'` — inline playback exists; the whole file is fetched before the first frame. |
| Client copy | `FileVersionsService.openDownload` for a CLIENT reads the whole object into memory (`readAll`, capped at the 100 MiB hard limit), `prepareForClient → neutraliseMp4` copies the buffer again (`Buffer.from`) and serves `Readable.from([copy])`: ≥ 3 × file size transient per request (chunks + concat + copy) → ~300 MiB for a 100 MiB video. `clientReleaseCheck` does the same before a delivery is created. Memory risk for the API service; to be measured (row 12). |
| Upload path | multer `memoryStorage`, whole file in RAM, hard ceiling 100 MiB (`MAX_UPLOAD_BYTES_HARD_LIMIT`), per-deployment `FILE_MAX_UPLOAD_BYTES` (default 25 MiB; production unset → 25 MiB, owner gate O6). `validateUpload` refuses `length > maxBytes`, so exactly 100 MiB is accepted at the ceiling. Content checked by signature (`ftyp` at byte 4 for MP4; QuickTime atoms for MOV). |
| Storage in tests | MinIO is archived; the A09 in-memory stub `apps/web/e2e/support/s3-stub.mjs` already answers `Range` with `206` + `Content-Range`. The CI `api` job has no object storage configured; integration suites that touch bytes stub `getObjectStream`. |
| Codecs | Playwright Chromium 156 (desktop and Pixel 7 profiles): `canPlayType` H.264/AAC in MP4 = "probably"; `video/quicktime` = "" (Chromium does not advertise MOV; Safari does). ffmpeg 9 available locally for fixtures; not assumed in CI. |
| Graphify dependents | `writeDownloadResponse` ← `FilesController.downloadVersion`, `ClientFilesController.downloadVersion`. `StorageService.getObjectStream` ← `FileVersionsService.openDownload`, `FileVersionsService.clientReleaseCheck`. `prepareForClient` ← `openDownload`, `clientReleaseCheck`, `client-file-privacy` tests. No other caller; invoices PDF uses its own renderer. |
| Blueprint (§5, §6) | Reuses `FileAsset/FileVersion` + `StorageService` (inv. 5.6); no new module, no schema change, no migration; security 6.11 (server-side checks, no storage keys or pre-signed URLs to clients) kept — ranges are parsed by the API and re-issued to storage, never forwarded raw. No conflict. |

## Acceptance matrix

| # | Requirement (original wording / owner rule) | Evidence: test or measurement | Functional? | Status |
|---|---|---|---|---|
| 1 | Dependency C02 not broken: real MP4 upload still 201, fake `.mp4` still 400, > limit refused with a clear message | `file-formats-matrix`, `phase-3-file-storage` (unchanged) + new `video-large-files` integration cases | yes | OPEN |
| 2 | Upload of a real MP4 of exactly 25 MiB accepted with the default limit; `sizeBytes`, `mimeType=video/mp4` right; download bytes identical (SHA-256) | `video-large-files`: 25 MiB synthetic MP4 (valid box tree, `mdat` padding) → 201, GET content hash = upload hash | yes | OPEN |
| 3 | Upload of a real MP4 of exactly 100 MiB accepted when `FILE_MAX_UPLOAD_BYTES=104857600`; 100 MiB + 1 byte refused; 25 MiB + 1 byte refused at the default | `video-large-files` (limit 100 MiB on the isolated stack) + `phase-3` limit tests | yes | OPEN |
| 4 | MOV accepted and served (`video/quicktime`), playback where the browser supports it, download identical | `video-large-files` MOV case; browser note recorded (row 15) | yes | OPEN |
| 5 | Inline playback in the workspace file page (staff): a `<video>` element with the version's bytes, `readyState ≥ HAVE_CURRENT_DATA`, `duration > 0`, plays (currentTime advances) — desktop and mobile | e2e `08-video.spec.ts` (OWNER): upload the H.264 fixture as a version → compare pane / preview shows `<video>` → metadata loaded → `play()` advances | yes | OPEN |
| 6 | Inline playback in the client delivery page (CLIENT): same assertions on the prepared copy — desktop and mobile | e2e `08-video.spec.ts` (CLIENT) on a delivered video | yes | OPEN |
| 7 | Download (attachment) by staff: `Content-Disposition: attachment; filename=<original>`, `Content-Length` = size, bytes identical | `video-large-files` + e2e download event (filename, size) | yes | OPEN |
| 8 | Download by the client: neutral filename, `udta/meta/XMP` boxes blanked, file still a valid MP4 (box tree walks to the end; `mdat` bytes unchanged) | `video-large-files` client case + `client-file-privacy` (unchanged) | yes | OPEN |
| 9 | Range requests honoured on both content routes: `bytes=0-1` → 206, `Content-Range: bytes 0-1/N`, `Content-Length: 2`; mid-range; open end `bytes=K-`; suffix `bytes=-K`; unsatisfiable → 416 with `bytes */N`; multiple ranges or malformed → full 200; every 200 carries `Accept-Ranges: bytes` | `video-large-files` range cases on `/files/...` and `/client/files/...`, through the real S3 SDK against the stub (206 parsed from storage) | yes | OPEN |
| 10 | Range on the client route is served from the prepared copy: a range covering the `udta` box returns blanked bytes, the same slice a full client download gives | `video-large-files` client range case | yes | OPEN |
| 11 | Authorisation unchanged under `Range`: anonymous 401; other tenant 404; other client 404/403; EMPLOYEE/CONTRACTOR on the client route 403; non-downloadable status 403; audit event written once per request | `video-large-files` + existing `security-gate-client-isolation` / `security-gate-client-portal-v2` (unchanged, rerun) | yes | OPEN |
| 12 | Memory bounded: API process RSS/heap measured during a 100 MiB upload and a 100 MiB client download (before/after); the client path must not hold multiple full copies of the video (streamed or ≤ 1 copy); decision recorded | measurement on the isolated stack (`process.memoryUsage()` via a test hook or `ps`) recorded in the run record | measured | OPEN |
| 13 | Timing measured: time to first frame and full-download time for 25 and 100 MiB, desktop and mobile emulation, local stack | run record | measured | OPEN |
| 14 | Tests run in CI: integration suite in the `api` job batch, e2e spec in `e2e-smoke` (desktop + mobile); fixture is a committed tiny H.264 MP4 (≈ 22 KB); large files are generated at run time, never committed | `.github/workflows/ci.yml`, CI run on the final head | — | OPEN |
| 15 | Browser support recorded honestly: Chromium plays H.264 MP4; MOV behaviour in Chromium noted; Safari needs 206 (fixed by row 9, not browser-tested here) | this file, scope notes | — | OPEN |
| 16 | Regression: `phase-3-file-storage`, `file-formats-matrix`, `client-file-privacy`, `security-gate-file-deletion`, `security-gate-client-portal-v2`, isolation gate, web static tests, API and web typecheck all green | local runs + CI | — | OPEN |
| 17 | Graphify: dependents of changed symbols reviewed after the change; `graphify update .` run | audit table above + post-change query | — | OPEN |
| 18 | Security: no storage key, bucket or pre-signed URL to the browser; `Range` parsed and rebuilt (never forwarded raw); storage `Content-Range` validated before it is echoed; `X-Content-Type-Options: nosniff` and `Cache-Control: private, no-store` kept on 200 and 206 | code review + `video-large-files` header assertions | yes | OPEN |
| 19 | CI fully green on the final head; PR with this matrix; planning files, panel and checkpoint updated | PR checks, `docs/master-plan` | — | OPEN |
| 20 | Merge, deploy and production verification when authorised. Production stays at 25 MiB until O6; 100 MiB cannot be verified in production before O6. Authenticated production checks need the owner's explicit authorisation for fictional data (as O36 gave for A09) | release record | — | BLOCKED — OWNER (requested only after rows 1–19 are PASS) |

## Run record

Filled from the final local run and the CI run on the final head.

| Where | Result |
|---|---|
| Before the change (baseline, main `5f12968`) | — |
| Local integration `video-large-files` | — |
| Local e2e `08-video` desktop / mobile | — |
| Memory (row 12) | — |
| Timing (row 13) | — |
| CI on final head | — |

## Scope notes

- "MinIO" in the task note is replaced by the in-memory S3 stub (MinIO downloads and images are archived; recorded in A09). The stub implements `Range` the way S3 does (`206`, `Content-Range`), which is what the API's SDK path exercises.
- Production verification above 25 MiB depends on O6 (production `FILE_MAX_UPLOAD_BYTES`), an owner environment change outside this task. Recorded, not reduced.
