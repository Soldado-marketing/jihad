# C08 — acceptance checklist and evidence matrix

**Task (master task list, row C08):** Storage persistence and cleanup verification after deletes. Deps: —. Notes: extend `security-gate-file-deletion` evidence to production: count objects before/after the O2 run (read-only inventory via `railway run`). Acceptance: inventory shows no orphan after the fictional file deletion.

**Closure status (2026-11-10): READY FOR RELEASE — not DONE.** Rows 1–17 PASS (CI run 42819559952 on `05b1a8e`); the production criterion ("inventory shows no orphan after the fictional file deletion") holds on recorded evidence: 28 objects stored and 28 removed by the product's delete path, bucket at 0 objects before and after. Row 18 is the owner's merge of PR #162 (tests and docs only); C08 is DONE when it is merged and main CI is green.

Written before implementation (owner's rules of 2026-11-04: checklist from the original specification first, one task at a time, independent comparison before closure; functional tests, never page-load checks). Status values: PASS (test or measurement named) · OPEN · BLOCKED — OWNER.

## Blueprint §30 validation (2026-11-10)

Consistent with the Blueprint (file storage owned by `files` / `file-versions` / `storage`, §26; invariant 11 "safe file access" untouched). No duplicate system, no schema or migration, no authorisation change, no tenant-scope change (the suite asserts it), no finance data, no new integration, files inside the MAOS root. Production: read-only log reads only; no production data is created or changed. Railway: a merge that touches `apps/api/test` may rebuild the API image from identical sources. C08 is the next task in order after C07. `BLUEPRINT_CONFLICT: NO`.

## Audit before coding (2026-11-10, main `da9df6a`)

| Area | Finding |
|---|---|
| Object deletion | Exactly one caller of `StorageService.deleteObject`: `FilesService.purgeStoredObjects`, reached only from `FilesService.delete` (`DELETE /api/files/:id`, permission FILE DELETE). Keys are read from the company's own rows, the whole set is checked against the company namespace before the first delete, objects go first and rows second, a storage failure aborts and leaves the file retryable. Sound — not changed. |
| Row deletion | `fileAsset.delete` only in `FilesRepository.delete` (after the purge); `fileVersion.deleteMany` only as the rollback of a reservation whose write failed. No route deletes a single version. |
| Cascades (`schema.prisma`) | `FileVersion → FileAsset` cascade (rows follow the asset, after the purge). `FileAsset → Project` and `→ Task`: `SetNull` — deleting a project or task keeps the file, its rows and its objects. `FileAsset → Customer`: `NoAction`. `FileAsset/FileVersion → Tenant`: cascade, but no product code deletes a company (`tenant.delete` does not exist in `apps/api/src`). |
| Existing gate | `security-gate-file-deletion.test.mjs`, 17 behavioural cases through fakes for the repository and the storage gateway (every version's object, each key once, objects before rows, no row delete on a storage failure, retry converges, keys from the company's rows, namespace check before storage, metadata-only files, unconfigured storage refused, wiring and permission). In CI. It proves call order; it holds no bucket, so it cannot show an inventory. |
| Inventory tool | C07's `storage-reconcile` lists the bucket and every version row inside the API and reports counts on `/health/ops` (OWNER only). This replaces the `railway run` script the task row names: it runs where the credentials already are (B05's own recommendation) and needs no credential on the Mac. |
| Production evidence available | API logs of every deployment since 2026-11-03 are still readable; `StorageService` logs `object_stored` per write and `FilesService` logs `file_objects_deleted … count=N` per delete. B05 inventory of 2026-11-02: 0 objects. Fictional runs under O36/O55/O56 uploaded and deleted files through the API. Three `storage-reconcile` rounds and the OWNER's reading of 2026-11-10: 0 objects. |
| Gap found | No test deletes through the HTTP API against a store that can be listed, so "the bucket is back to its starting inventory" is not asserted anywhere in CI; persistence of the files that were *not* deleted is asserted only by hand (B05, isolated). This is what C08 adds. |

## Acceptance matrix

| # | Criterion | Evidence | In CI | Status |
|---|---|---|---|---|
| 1 | Every path that removes file rows or objects is identified from the code, the schema and Graphify | audit table above | — | PASS (audit table; `graphify explain StorageService`, callers of `deleteObject` and the row deletes read in source) |
| 2 | Deleting a file removes the object of every version, objects before rows, keys from the company's own rows | `security-gate-file-deletion` (existing, unchanged) | yes | PASS — `security-gate-file-deletion` 17/17 locally and in CI, source untouched |
| 3 | Inventory after deletes: files uploaded through the HTTP API and deleted through `DELETE /api/files/:id` leave the bucket with exactly the key set it had before; their rows are gone; the file and its content answer 404 | new `storage-delete-inventory` suite, real database + listable S3 stub | yes | PASS — `storage-delete-inventory` case 1: 3 objects at the start, 7 after four uploads (one key per version under its company and file), exactly the starting key set after two `DELETE /api/files/:id` (204); 0 version rows, 0 asset rows; file and content 404 |
| 4 | Persistence: files that were not deleted — in the same project and in another company — keep byte-identical content after the deletes and after an API restart (a second API instance on the same database and store) | same suite | yes | PASS — `storage-delete-inventory` cases 2 and 7: sha256 of every kept version identical after the deletes, in the same project and in another company, and again after the API instance was closed and a second one started on the same database and store; the restart changed no key |
| 5 | A failed object delete answers an error, keeps the row and the file retryable; the retry completes and the inventory is clean | same suite | yes | PASS — `storage-delete-inventory` case 3: second object delete made to fail → 500 without any key in the body, both rows kept, file still readable, one object already gone; retry 204, starting key set restored, 0 rows |
| 6 | Boundaries: another company's OWNER (404) and a CLIENT of the same company (403) cannot delete; nothing is removed | same suite | yes | PASS — `storage-delete-inventory` case 4: other company's OWNER 404, CLIENT of the same company 403, no session 401; key set and rows unchanged, content identical |
| 7 | Deleting a project or a task does not orphan: the file, its rows and its object survive (`projectId` / `taskId` null), and the file stays an ordinary, manageable file — listed, editable, readable, deletable | same suite | yes | PASS — `storage-delete-inventory` cases 5 and 6: `DELETE /api/projects/:id` 204 and `DELETE /api/tasks/:id` 204; key set unchanged, row kept with the reference set to null, content identical; the file is in the OWNER's `GET /api/files` (project shown as none), `PATCH` renames it, `DELETE /api/files/:id` removes it and its object |
| 8 | The reconciliation report after the deletes: 0 orphan objects, object count equal to the listing, no row of the suite's companies without its object | same suite, `StorageReconcileJob` | yes | PASS — `storage-delete-inventory` case 8: report `objects` = listing, `orphanObjects 0`, `orphanBytes 0`, `truncated false`; one row per object and no row of the suite's companies without its object; case 9 then deletes the remaining files and the bucket is empty |
| 9 | No product code, schema or web change: sound parts are not re-programmed | diff of the branch | — | PASS — branch diff: `apps/api/test/storage-delete-inventory.test.mjs` (new), one line in `.github/workflows/ci.yml`, one assertion scope in `apps/api/test/storage-reconcile-job.test.mjs` (see run record), this file; nothing under `apps/api/src`, `apps/api/prisma` or `apps/web` |
| 10 | Regression: file suites, full `npm test`, CI typecheck config, build | local run | yes | PASS — file and scheduler suites green (see run record); full `npm test` 611 tests: 601 pass, 0 fail, 10 todo (backlog entries, as before); `npx tsc --noEmit -p tsconfig.build.json` clean; `npm run build` clean |
| 11 | CI: six jobs green on the code head, the new suite in the integration batch | CI run | yes | PASS — CI run 42819559952 on `05b1a8e`: six jobs SUCCESS, `storage-delete-inventory` in the API job's integration batch |
| 12 | Graphify refreshed after the change; nothing depends on the new test file | `graphify update .` | — | PASS — `graphify update .` after the change (10 948 nodes); the new file has no dependents, it imports only `test/support/s3-stub.mjs` and the compiled app |
| 13 | Production, before: object count before the fictional runs | B05 inventory 2026-11-02 (read-only, in-process credentials) | — | PASS — 0 objects, 0 bytes; `FileVersion` 0 rows |
| 14 | Production, the fictional runs: objects were really written and were removed by the product's delete path | API logs per deployment (read-only, 2026-11-10), table below | — | PASS — 28 objects stored, 28 removed by `DELETE /api/files/:id` (24 delete calls), 0 failed writes, 0 namespace refusals |
| 15 | Production, after: **inventory shows no orphan after the fictional file deletion** | `storage-reconcile` rounds 2026-11-07, -08, -09 (log) and the OWNER's `/health/ops` reading of 2026-11-10 (C07 record) | — | PASS — 0 objects in the bucket, therefore 0 orphans; 0 version rows, 0 dangling, 0 metadata-only, 0 stale reservations, `truncated false` |
| 16 | Deviations from the task row stated, not hidden | this file, "Method and limits" | — | PASS (see below) |
| 17 | Security: no storage key, bucket name, credential or token in this file, the suite's output or the captured logs (file ids redacted) | review of the diff and the scratch logs | — | PASS — the suite prints no key (the 500 body is asserted to contain none); the ledger was counted from lines that carry byte counts and file ids only, ids redacted on capture; a search of the captured logs for a key pattern finds none; test credentials in the suite are placeholders for the stub |
| 18 | Merge when authorised (tests and docs only; no migration, no behaviour change); main CI green afterwards | release record | — | BLOCKED — OWNER (merge approval) |

## Production ledger (read-only, API logs read 2026-11-10)

Counted per API deployment from the lines `object_stored` (one per object written) and `file_objects_deleted … count=N` (one per file deleted, N objects). File ids were redacted when the lines were captured; no key appears in these lines by design.

| API deployment | Live from (UTC) | Objects stored | Delete calls | Objects deleted | Failed writes | Run |
|---|---|---|---|---|---|---|
| `78010e75` | 2026-11-03 14:11 | 1 | 1 | 1 | 0 | acceptance run of 2026-11-03 (one 218-byte file, stored 15:56 UTC, deleted 15:57 UTC) |
| `be2ed7ff`, `5c664bd2` | 2026-11-03 21:25 | 0 | 0 | 0 | 0 | — |
| `a6e7127c` | 2026-11-04 23:19 | 6 | 4 | 6 | 0 | A09 acceptance under O36 |
| `9586dbe6` | 2026-11-05 14:34 | 5 | 5 | 5 | 0 | C05 verification under O55 (record: "5 files deleted through the API") |
| `566449f1` | 2026-11-06 14:48 | 16 | 14 | 16 | 0 | C06 verification under O56 (record: "14 files deleted through the API") |
| `b85d8e18` (live) | 2026-11-07 21:46 | 0 | 0 | 0 | 0 | three `storage-reconcile` rounds: 0 objects |
| **Total** | | **28** | **24** | **28** | **0** | |

Before: 0 objects (2026-11-02). After: 0 objects (2026-11-07 to 2026-11-10, listed inside the API). Every object written in between was removed by the product's own delete path. Logs of deployments before 2026-11-03 12:24 are no longer retained; this does not weaken the result, because an object left behind at any time would still be in the bucket and the listing finds none.

## Method and limits

- **Inventory tool changed, criterion unchanged.** The task row names a read-only inventory script under `railway run`. The inventory was taken by the `storage-reconcile` report instead (C07, inside the API, OWNER-only), and read by the production OWNER from their own session.
- **No new fictional data on production for C08.** The fictional file deletions the criterion needs already took place under O36, O55 and O56 and are in the logs; repeating them would add nothing, and the session's permission layer refuses production seeds (not bypassed, on the owner's instruction).
- **Persistence on production across a deploy is not observable today:** the bucket holds 0 objects, and the two real files of the platform's own company are metadata only. Persistence is therefore shown on the isolated stack (row 4) and by B05's earlier isolated restart check; this limit is stated, not counted as production evidence.
- **Log dates are UTC.** The planning files date the runs by working session; the log lines place the C05 deletions at 2026-11-06 13:30 UTC and the C06 deletions at 2026-11-06 22:16 UTC.

## Files after a project or task is deleted (owner's condition for O58, checked 2026-11-10)

- **Is it intended?** The rule is written explicitly in the schema and its migration (`FileAsset.project` and `.task`: `onDelete: SetNull`), and a file without a project or task is a first-class state everywhere else: `projectId` and `taskId` are optional when a file is created, the upload form offers "No project", and the file list prints "No project". No design document states the intention in a sentence; the code and the interface are consistent with it.
- **Is the file still manageable?** Yes. OWNER, MANAGER and EMPLOYEE see every file of the company (`ResourceScopeService.fileWhere` adds no filter for them), so the file stays in the list, opens, can be renamed, and can be deleted with its object — asserted by cases 5 and 6. A CONTRACTOR sees files only through their projects and tasks, so the file leaves their view together with the project, which is the access rule working as designed. Nothing is left in storage without a row, and no row is left that staff cannot reach.
- **Two limits, recorded, not changed:** a file cannot be moved to another project afterwards (`UpdateFileDto` has no `projectId`), and the project's delete confirmation in the web app says "Delete this project and all its tasks?" without mentioning that its files remain as company files. Both are product wording/feature questions, not storage defects.

## Findings for later (not changed in C08)

- **Ambiguous write failure.** When `putObject` fails, the upload rolls back the reserved row but does not try to remove the object. If the store had written the object and only the reply was lost, an orphan object would remain. `storage-reconcile` would report it; production shows `storage_write_failed` 0 times. A best-effort delete of the reserved key in that rollback would close it — a product change, proposed as its own task.
- **Company deletion.** File rows cascade from the company. No product path deletes a company today; if one is built (R05), it must purge the objects first, as the file delete does.

## Run record

| Where | Result |
|---|---|
| Before the change (main `da9df6a`) | no test deleted through the HTTP API against a listable store; the inventory after a delete was asserted nowhere in CI; persistence of untouched files was a manual isolated check (B05) |
| New suite, local (disposable PostgreSQL 16 `maos-c08-pg`, in-process S3 stub; container removed afterwards) | `storage-delete-inventory` 9/9 in 1.6 s (8/8 before the task case was added on the owner's condition of 2026-11-10) |
| Mutation check (compiled output only, restored afterwards) | with the purge call removed from `dist/modules/files/files.service.js`: 4 of the then 8 cases fail (inventory after delete, failed-delete retry, reconciliation, empty bucket) and the report shows `orphanObjects 6`, `orphanBytes 7480` — the suite detects a delete that leaves objects behind |
| Local regression | `security-gate-file-deletion` 17/17; `storage-reconcile-job` 6/6; `storage-reconcile` 13/13; `client-file-privacy` 16/16; `phase-3-file-storage` 54/54; `scheduler` 7/7; `ops-alerts` 5/5 |
| Local full suite (`npm test`, integration suites skipping as in CI's Full-suite step) | 611 tests: 601 pass, 0 fail, 10 todo (backlog entries, as before) |
| Typecheck / build | `npx tsc --noEmit -p tsconfig.build.json` clean; `npm run build` clean |
| First CI run (42818765125, `2635ab7`) | FAILED in the API job's integration batch — not in the new suite (8/8 there) but in C07's `storage-reconcile-job` case 2: `no row deleted 15 !== 14`. Cause: that case counted every `FileVersion` row of the shared database, and the new suite writes and removes its own rows while the files run in parallel. Reproduced locally: the two suites together, old assertion, 6 of 12 runs fail |
| Root-cause fix (`05b1a8e`, test only) | the C07 case counts the rows of its own two companies; its direct checks of the two rows the job could be tempted to delete and its source check stay. Locally 12 of 12 parallel runs pass together with `phase-3-file-storage` and `client-file-privacy` |
| CI's integration batch, local, three parallel runs (34 files, fresh disposable database) | no failure in the 32 other files, the new suite included. The only failures are local to this invocation and known: `integration-api` (38 lines, 401 instead of the expected codes — CI runs that file first and alone on the empty database, here it ran alongside the others) and the `video-large-files` memory case on the developer Mac (2 of 3 runs; CI green, follow-up recorded since C06) |
| CI on `05b1a8e` (run 42819559952) | six jobs SUCCESS |
| Production (read-only) | ledger above from the API logs of 18 deployments (2026-10-31 to 2026-11-10); `storage-reconcile` rounds and the OWNER's `/health/ops` reading as recorded in `docs/MAOS_C07_ACCEPTANCE.md`; no write, no fictional data, no restart |
