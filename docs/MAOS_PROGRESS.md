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
