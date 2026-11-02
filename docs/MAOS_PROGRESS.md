# MAOS Progress Log

Chronological record of completed work, verified tests, PRs, deployments, failures and their resolutions, and outstanding decisions. Newest entry last. Entries before 2026-11-02 are in `docs/MAOS_EXECUTION_LEDGER.md` (sections "Completed / merged / blocked" and the dated window entries); they are not repeated here.

Backlog of record: `docs/MAOS_MASTER_TASK_LIST.md`. Checkpoint: `docs/MAOS_RESUME.md`.

---

## 2026-11-02 — Client Portal V2 release (#132 → #129 → #130 → #131)

**Merged and deployed, in this order, each with a separate owner GO:**

| PR | Merge commit | Merged (UTC) | Content |
|---|---|---|---|
| #132 (other session) | `e0eab78` | 14:58 | A task shared with the client reaches the client portal |
| #129 | `81843dd` | 15:10 | Client file privacy, client-friendly portal |
| #130 | `83b9be8` | 15:26 | Client Portal V2: My Work, invoices with partial payments, filming appointments, notifications |
| #131 | `de2ee1b` | 15:51 | Report a problem → management (internal notes, no staff identities); project invoices inherit the project's customer, 409 `INVOICE_SCOPE_MISMATCH` on conflict |

**Procedure per PR:** main merged into the branch (no conflicts) → local CI-equivalent → GitHub CI green on the exact head → fresh backup with sha256, `pg_restore --list` and isolated REHEARSAL OK (`maos-20261102T142251Z`, `…T150507Z`, `…T154400Z`) → `gh pr merge --merge --match-head-commit` → Railway deploy of both services verified → readiness 200 → logs clean → unauthenticated/forged-token smoke.

**Tests on the final code (`de2ee1b`):** API unit 401/401; integration-api 35/35; integration + security 458/458; web 291/291; main CI SUCCESS. Production smoke: 34/34 forged or unauthenticated requests refused with 401; new pages served 200.

**Acceptance requirements (owner directive, isolated stack with fictional data):**

| Requirement | Result |
|---|---|
| Video upload (MP4), playback, download, size limit, content validation | PASS up to 25 MiB: real MP4 201, fake `.mp4` 400, 28.6 MB refused; playback and download in the portal. Above 25 MiB NOT VERIFIED (production `FILE_MAX_UPLOAD_BYTES` unset → 25 MiB; hard ceiling 100 MiB) |
| Persistent storage after restart | PASS: identical bytes after API restart (isolated S3-compatible store); production bucket private |
| Critical notifications | PASS for in-app notices and appointment reminders; documented limit: in-app notices do not reach an offline client; no external messaging without authorization (D01) |
| Google Drive privacy | PASS for MAOS (it never touches Drive sharing); Drive-side audit NOT VERIFIED (needs owner approval to use the connector) |
| Bucket capacity | NOT VERIFIED (B05) |
| Real-user production acceptance (client, employee, manager) | NOT VERIFIED (A01–A03; no production test accounts; real client data not allowed) |

**Failures seen and resolved during the release (none affected production):**

- An inline re-run of the integration batch exited 1 after migrations without running a test (file-list extraction failed inside the inline shell); superseded by the scripted run, 458/458.
- `deadline-reminders` "reminds the assignee … once" failed once in a 44-file batch; passed 3/3 alone and 458/458 in a second batch; #131 touches no scheduler or task code → F03.
- First web run on #131 failed two guards (new nav id without a sidebar slot; forbidden word "reports" in client source); fixed, 291/291.
- Early wait loops exited 144 with no output; isolated test servers were stopped deliberately for rebuilds.

**Cleanup:** session API (3212) and web (3230) stopped; containers `maos-demo-pg` and `maos-try-minio` stopped and kept; disposable `maos-fu-testdb` removed. Other sessions' containers, processes and the main checkout (on `fix/client-scope-inheritance`) untouched.

**Final status 2026-11-02 16:05Z: HEALTHY** — both Railway services SUCCESS on `de2ee1b`, readiness 200, scheduler running (invite-expiry, deadline-reminders, appointment-reminders), logs clean.

**Owner V2 production checklist (A01):** sign in as owner → create a delivery on a client project → open the portal as that client's (fictional) user → delivery visible, approve, request a revision → invoice with a partial payment shows the remaining balance → filming appointment appears with a reminder → report a problem → manager answers with an internal note → client sees the answer, not the note → employee has no "Problem reports" entry.

## 2026-11-02 — Master Development Plan adopted

- Owner directive "MAOS — Master Development Plan & Continuous Execution" received after the release verification.
- State recovered: main `de2ee1b`; production `jihad` + `maos-web` SUCCESS on `de2ee1b`, readiness 200; open PRs #109, #110, #120; local nightly backups SUCCESS ×4 today, off-site copy not configured; production variables present: `RESEND_API_KEY`, S3 set, `MAOS_SCHEDULER_ENABLED`, `FILE_MAX_UPLOAD_BYTES` unset.
- Backlog reconciled against merged work: J02–J05 already delivered (#112, #114, #123, #124, #127); C04 delivered (#129–#131); E04 delivered; C01 configurable but production value undecided.
- Created `docs/MAOS_MASTER_TASK_LIST.md`, this file and `docs/MAOS_RESUME.md`; the ledger's RESUME CAPSULE now points to `MAOS_RESUME.md`.
- Phase 1 reconciliation: A01–A03 and B01, B02, B04 need the owner (production session, Resend dashboard, off-site provider, Drive connector approval). B03 (least-privilege design) and B05 (storage inventory) are the only Phase 1 rows Claude can advance without approval.

## 2026-11-02 — B05 storage inventory, B03 least-privilege design

- **B05 (read-only production check):** bucket inventory with credentials injected in-process (`railway run -s jihad`), output limited to counts: 0 objects, 0 bytes, versioning off. From today's dump (`maos-20261102T154400Z`): `FileAsset` 2 rows, both metadata-only (mime type and size null, `versionCount` 0, created 2026-10-24), `FileVersion` 0. Bucket and database are consistent: nothing has been uploaded to production yet, no orphan objects, no dangling references. Capacity not a concern at 0 bytes; storage monitoring does not exist yet (follow-up noted in the task list).
- **B03 (design only, nothing applied):** `docs/security/postgres-least-privilege-plan.md` — roles `maos_app` (DML only, default privileges for future migrations), `maos_backup` (`pg_read_all_data`), administrator kept for `migrate-deploy-one.sh`; SQL, verification queries, disposable-PG18 rehearsal steps, production window and rollback. Grounded in a code check: the API runs no DDL (raw SQL is `SELECT 1`, `SELECT … FOR UPDATE`, advisory lock, one `UPDATE`).
- Docs PR #133 opened (not merged; owner decision).

## 2026-11-02 — B03 rehearsal on a disposable PostgreSQL 18 (nothing touched in production)

Container `maos-b03-pg` (postgres:18, throw-away passwords in files, never printed), 15 migrations applied as the administrator, then the plan's SQL as-is.

| Check | Result |
|---|---|
| Role and grant inventory | `maos_app`: SELECT 48 / INSERT, UPDATE, DELETE 47 tables (`_prisma_migrations` read-only); `has_schema_privilege(maos_app, public, CREATE)` = false |
| `integration-api` as `maos_app` | 35/35 |
| Integration + security suites (44 files) as `maos_app` | 456/458. The 2 failures are the expected fault-injection tests that create a PostgreSQL trigger from the test itself (`time-entries` "a database refusal answers 400", `data-transfer` "rolls the whole file back"): test-only DDL, not application behaviour. CI keeps the administrator role, so CI is unaffected |
| Advisory lock as `maos_app` | `pg_try_advisory_xact_lock` → true (scheduler works) |
| Negative, `maos_app` | CREATE TABLE → permission denied for schema; DROP/ALTER TABLE → must be owner; INSERT/DELETE on `_prisma_migrations` → permission denied |
| Negative, `maos_backup` | INSERT and UPDATE → permission denied; SELECT works |
| `pg_dump` as `maos_backup` vs administrator | identical: 523 entries, 48 tables each |
| Default privileges | new table created by the administrator afterwards: `maos_app` INSERT … RETURNING works without a new GRANT |

Conclusion: the plan is safe to apply as written. Production application remains owner decision O10 (roles via the private tunnel, `DATABASE_URL` on `jihad`, Keychain item for the backup). Container removed after the run.

### Outstanding owner decisions (collected)

| # | Decision | Unblocks |
|---|---|---|
| O1 | Run the V2 production checklist as owner, or schedule a session for it | A01, A04 |
| O2 | Accept isolated evidence for employee/client/manager acceptance, or create fictional production accounts | A02, A03 |
| O3 | Off-site backup provider, account, bucket, key (paid) per `docs/ops/OFFSITE_BACKUP_SETUP.md` | B01 (D2) |
| O4 | Rotate `RESEND_API_KEY` in the Resend dashboard and on `jihad` | B02 |
| O5 | Approve a Drive-side sharing audit with the Drive connector | B04 |
| O6 | Production upload limit value (`FILE_MAX_UPLOAD_BYTES` on `jihad`, ≤ 100 MiB) | C01, C02 |
| O7 | Merge decisions for #109, #110; migration window for #120 | G01, G02 |
| O8 | E-mail notifications to real clients (D01) and AI provider/cost (L) when those phases start | D01, L |
| O9 | Merge docs PR #133 (planning files) | G03 |
| O10 | Production window for B03 roles + `DATABASE_URL` + Keychain switch, after the rehearsal passes | B03 |
