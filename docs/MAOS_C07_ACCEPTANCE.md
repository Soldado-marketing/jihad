# C07 — acceptance checklist and evidence matrix

**Task (master task list, row C07):** Storage lifecycle: orphan cleanup and retention rules. Deps: B06. Notes: job that lists objects without a FileVersion (and versions without object) and reports; deletion of orphans only after an owner decision (O38); retention policy per tenant later. Acceptance: report job + OWNER notice; no deletion without O38.

**Closure status:** OPEN — written before implementation (2026-11-07, main `63724e3`).

Written before implementation (owner's rules of 2026-11-04: checklist from the original specification first, one task at a time, independent comparison before closure; functional tests, never page-load checks). Status values: PASS (test or measurement named, green locally and in CI) · OPEN · BLOCKED — OWNER.

## Audit before coding (2026-11-07, main `63724e3`)

| Area | Finding |
|---|---|
| Object store access | `StorageService` (`apps/api/src/modules/storage/storage.service.ts`) is the only holder of credentials; it offers `putObject`, `getObjectStream` (with range), `objectExists`, `deleteObject` and, since B06, `countObjects` — a read-only `ListObjectsV2` walk under `S3_KEY_PREFIX` that returns counts only. No listing of keys exists yet; keys never leave the service except on the download path. |
| Key shape | `<prefix>tenants/<tenantId>/files/<fileAssetId>/v<n>/<uuid><ext>` (`object-key.ts`), tenant namespace verifiable from the key alone (`tenantNamespace`, `assertKeyBelongsToTenant`). |
| Write order | `FileVersionsService.upload`: reservation row first (`status QUARANTINED`, `storageKey` set), then `putObject`, then `activateVersion` (→ ACTIVE, previous → SUPERSEDED). A failed put deletes the reservation (best effort). Windows that can leave a mismatch: put succeeded but the process died before activation (row stays QUARANTINED, object present); put failed and the compensating delete failed (row without object); object written but the row was lost (object without row). |
| Delete order | `FilesService.delete → purgeStoredObjects`: keys from tenant-scoped rows, re-checked against the namespace, `DeleteObject` per key (idempotent), then the asset row (versions cascade). A crash between the two leaves rows whose objects are gone (dangling), or objects whose rows are gone — orphans. |
| Metadata-only rows | `FileVersion.storageKey` is nullable; production has 2 `FileAsset` rows with 0 versions (B05 inventory 2026-11-02: 0 objects, 0 bytes). Null-key rows own no bytes and must not be flagged. |
| Scheduler (D8) | In-process `SchedulerService`: one `setInterval(everyMs)` per job, advisory lock per round, 60 s transaction timeout, in-memory status, structured log per run. A job's first round happens only after its full interval — a daily job deployed daily would never run. Jobs: invite-expiry, deadline-reminders, appointment-reminders, client-review-reminders, ops-watchdog (lock 5), storage-capacity (lock 6). Production: `MAOS_SCHEDULER_ENABLED=true`, `MAOS_OPS_TENANT_SLUG` unset (oldest ACTIVE company receives ops notices), `S3_KEY_PREFIX` unset. |
| Ops notices (B06) | `OpsAlertsService.notifyOwners(dedupeKey, title, body ≤ 240)` → in-app notices to the OWNERs of the ops company only (INTERNAL audience; never another company, a manager or a client); `GET /health/ops` (OWNER, sensitive audit permission) shows status words and numbers only. `StorageCapacityJob` is the model: skip when storage is unconfigured, one notice per day via the dedupe key. |
| Web | No surface reads `/health/ops`; owners see ops notices on the notifications page. The task asks for a report job and an OWNER notice, not a new page — web unchanged. |
| Tests available | `test/support/s3-stub.mjs` (in-memory S3 with ListObjectsV2, Put, Head, Get+Range, Delete) used by `video-large-files` and the e2e stack; `ops-alerts.test.mjs` (real Nest app, isolated DB) is the pattern for notice/role assertions; `scheduler.test.mjs` for timers and locks. API unit tests load `dist/`. |
| Graphify dependents | `StorageService` ← `FileVersionsService`, `FilesService`, `StorageCapacityJob`, health. `OpsAlertsService` ← `OpsWatchdogJob`, `StorageCapacityJob`, `OpsController`. `SchedulerService` ← `SchedulerModule`, `OpsController`, `OpsWatchdogJob`. Adding a job touches `SchedulerModule` only; the `ScheduledJob` interface gains an optional field, so existing jobs are unaffected. |
| Blueprint §30 | 1 consistent (storage domain owns objects; D8 scheduler; B06 ops channel). 2 no duplicate system. 3 no schema change, no migration. 4 no authorization change (`/health/ops` keeps its permission). 5 tenant isolation: the job reads `FileVersion` across companies in-process to reconcile the platform's own bucket; it returns counts only, addresses the ops company only, never a key, a name or a tenant id in a notice or in `/health/ops`. 6 no finance data. 7 production: new daily job, read-only against the bucket and the database; no deletion. 8 Railway: API redeploy only. 9 no new integration. 10 files inside the MAOS root. 11 no active task; phase order kept (C07 after B06 DONE). 12 approved exact next task (owner: "Merge #159, start C07", 2026-11-07). |
| Out of scope (recorded, not reduced) | Deleting orphans (O38, after the first report); per-tenant retention rules (R05); legal document retention (K13); a control-center panel for the report; stuck `QUARANTINED` reservations whose object exists (data integrity, not storage lifecycle — counted as matched, mentioned in the status as `staleReservations`). |

## Acceptance matrix

| # | Requirement (from the task row and the owner's rules) | Evidence | Where | Status |
|---|---|---|---|---|
| 1 | Read-only inventory: every object under the configured prefix with key, size and last-modified; paginated; a `truncated` flag when the page cap is reached; the listing never reaches a response | `StorageService.listObjects`, unit test with the S3 stub | `storage-reconcile` tests | OPEN |
| 2 | Reconciliation (pure, no I/O): object with no `FileVersion.storageKey` → orphan object (count + bytes); row with a `storageKey` whose object is missing → dangling version; rows without `storageKey` → metadata-only, counted, never flagged; everything else matched | unit test, each class with one fixture | `storage-reconcile.test.mjs` | OPEN |
| 3 | Grace window: an object or a row younger than 15 minutes is in flight (upload or delete under way) and is excluded from both lists, so a running upload never becomes a false alarm | unit test with timestamps on both sides of the window | `storage-reconcile.test.mjs` | OPEN |
| 4 | Attribution without exposure: orphan objects are grouped by the tenant segment of the key (`tenants/<id>/`); keys outside that shape count as unattributed; the summary carries numbers only — no key, no tenant id, no bucket name | unit test asserts the summary's JSON has no key or id string | `storage-reconcile.test.mjs` | OPEN |
| 5 | Scheduled job `storage-reconcile`: registered with its own lock key, daily interval, **first round shortly after boot** (scheduler gains an optional first-run delay honoured for this job only; existing jobs unchanged), skips when storage is not configured, bounded listing inside the 60 s round | `scheduler.test.mjs` (timer with first-run delay), `ops-alerts`-style integration test | integration batch | OPEN |
| 6 | OWNER notice: when orphans or dangling rows exist, one in-app notice per OWNER of the ops company per day (dedupe key by day) with a plain sentence of counts and sizes and the words that nothing was deleted; no notice when clean; never another company, a MANAGER or a CLIENT | integration test with the in-process S3 stub: a stray object + an old row without object → 1 notice to the ops owner only; second run → 0; clean store → 0 | `storage-reconcile-job.test.mjs` | OPEN |
| 7 | **No deletion**: the job never calls `deleteObject` or deletes a row; after a run the stub's object map and the `FileVersion` table are unchanged; the job source has no delete call (pinned by test); O38 stays the gate | integration test counts before/after; source pin | `storage-reconcile-job.test.mjs` | OPEN |
| 8 | `/health/ops` shows the last reconciliation (time, totals, orphans, orphan bytes, dangling, metadata-only, stale reservations, truncated) to the OWNER only (401 anonymous, 403 MANAGER); the JSON contains no object key | integration test | `storage-reconcile-job.test.mjs` | OPEN |
| 9 | The watchdog covers the new job (a failed or silent round becomes a notice) because it is a registered job with an interval | assertion that the scheduler status lists `storage-reconcile`; watchdog logic unchanged | `ops-alerts.test.mjs` registration case extended | OPEN |
| 10 | Bounded cost: listing capped at 200 pages (200 000 keys); rows read with a narrow select (`id, tenantId, storageKey, status, createdAt`); a run over 2 000 stub objects + 2 000 rows finishes well inside the round timeout — measured | integration measurement | run record | OPEN |
| 11 | Tenant isolation unchanged: no new route, no tenant-scoped data in notices, isolation gate green | CI `isolation-gate` job | CI | OPEN |
| 12 | Tests wired into CI: unit file in the unit batch, integration file in the integration batch (`ci.yml`); full `npm test` green | `.github/workflows/ci.yml` | CI | OPEN |
| 13 | Typecheck and build clean (API); web untouched | `npm run typecheck`, `npm run build` | local + CI | OPEN |
| 14 | Graphify: dependents of changed symbols reviewed after the change; `graphify update .` run | audit table + post-change query | run record | OPEN |
| 15 | Blueprint §30 validated (table above), no `BLUEPRINT_CONFLICT` | audit table | this file | OPEN |
| 16 | Planning files, panel and checkpoint updated; O38 text carries the first production report's numbers once known | `docs/master-plan` | PR | OPEN |
| 17 | CI fully green on the final head; PR with this matrix | PR checks | PR | OPEN |
| 18 | Merge, deploy (API only, no migration) and production verification when authorised: the first round runs shortly after the deploy; its structured log line (`scheduled_job_succeeded job=storage-reconcile`) and `/health/ops` as a fictional OWNER show the counts — expected 0 orphans, 0 dangling on today's production (B05: 0 objects; C05/C06 fictional data removed) and therefore no notice; then remove the fictional data | release record | — | BLOCKED — OWNER (requested only after rows 1–17 are PASS) |

## Run record

To be filled from the final local run and the CI run on the final head.

| Where | Result |
|---|---|
| Before the change (baseline, main `63724e3`) | — |

## Scope notes

- Reporting only. The O38 decision ("allow deletion of orphan storage objects after the first report") is taken by the owner with the first report's numbers in hand; a deletion path is a separate task after that decision.
- The reconciliation reads `FileVersion` rows of every company because the bucket is the platform's own; the result is aggregated before it leaves the job, and the only recipients are the OWNERs of the ops company (`MAOS_OPS_TENANT_SLUG`, else the oldest ACTIVE company — on production the platform's own company).
